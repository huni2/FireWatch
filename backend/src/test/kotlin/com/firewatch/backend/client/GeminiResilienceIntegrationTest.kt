// 실제 HTTP 모델 전환과 일별 영속 예산·동시성·재시작 한도를 검증한다.
package com.firewatch.backend.client

import com.firewatch.backend.web.TestDatabase
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.transaction.support.TransactionTemplate
import java.net.InetSocketAddress
import java.time.Instant
import java.util.Collections
import java.util.concurrent.Executors
import kotlin.test.*

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:gemini-resilience-test;DB_CLOSE_DELAY=-1"])
class GeminiResilienceIntegrationTest {
    companion object { @JvmStatic @DynamicPropertySource fun database(registry: DynamicPropertyRegistry) = TestDatabase.configure(registry) }
    @Autowired lateinit var budget: GeminiCallBudget
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var transaction: TransactionTemplate

    @BeforeEach fun clear() {
        jdbc.update("DELETE FROM gemini_daily_usage")
        jdbc.update("DELETE FROM collection_circuits")
    }

    private fun <T> withServer(statuses: List<Int>, run: (GeminiClient, List<String>) -> T): T {
        val paths = Collections.synchronizedList(mutableListOf<String>())
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            paths.add(exchange.requestURI.path)
            exchange.requestBody.use { it.readBytes() }
            val status = statuses[(paths.size - 1).coerceAtMost(statuses.lastIndex)]
            val json = if (status == 200) """{"candidates":[{"content":{"parts":[{"text":"검증된 시장 요약"}]}}]}""" else """{"error":{"message":"temporary"}}"""
            val bytes = json.toByteArray(Charsets.UTF_8)
            exchange.responseHeaders.add("Content-Type", "application/json; charset=utf-8")
            exchange.sendResponseHeaders(status, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        try { return run(GeminiClient("http://127.0.0.1:${server.address.port}/v1beta", "local-test-key", "gemini-3.6-flash", budget), paths) }
        finally { server.stop(0) }
    }

    private fun fetch(client: GeminiClient) = client.fetchMarketBriefing(null, null, null, null, null, null, null, null, null, null, null, null, emptyList())

    @Test fun `503은 무료 보조모델로 전환하고 성공한 결과와 모델을 반환한다`() {
        withServer(listOf(503, 200)) { client, paths ->
            val result = fetch(client)
            assertEquals("gemini-3.5-flash-lite", result.modelUsed)
            assertEquals("검증된 시장 요약", result.marketSummary)
            assertEquals(listOf("/v1beta/models/gemini-3.6-flash:generateContent", "/v1beta/models/gemini-3.5-flash-lite:generateContent"), paths)
            assertEquals(2, jdbc.queryForObject("SELECT request_count FROM gemini_daily_usage", Int::class.java))
        }
    }

    @Test fun `모델 전환과 다음 작업을 합쳐도 하루 HTTP 요청은 세 번뿐이다`() {
        withServer(listOf(503)) { client, paths ->
            assertFalse(assertFailsWith<GeminiCallException> { fetch(client) }.budgetExhausted)
            assertTrue(assertFailsWith<GeminiCallException> { fetch(client) }.budgetExhausted)
            val blocked = assertFailsWith<GeminiCallException> { fetch(client) }
            assertTrue(blocked.budgetExhausted)
            assertFalse(blocked.requestAttempted)
            assertTrue(blocked.message!!.startsWith("GEMINI_DAILY_LIMIT"))
            assertEquals(3, paths.size)
            assertEquals(3, jdbc.queryForObject("SELECT request_count FROM gemini_daily_usage", Int::class.java))
            assertNull(GeminiCallBudget(jdbc, transaction).reserve())
        }
    }

    @Test fun `429는 보조모델을 호출하지 않고 당일 예산을 중지한다`() {
        withServer(listOf(429)) { client, paths ->
            val error = assertFailsWith<GeminiCallException> { fetch(client) }
            assertEquals(429, error.httpStatus)
            assertTrue(error.budgetExhausted)
            assertEquals(1, paths.size)
            assertEquals(1, jdbc.queryForObject("SELECT request_count FROM gemini_daily_usage", Int::class.java))
            assertNull(budget.reserve())
        }
    }

    @Test fun `인증 오류는 같은 작업에서 재시도하지 않는다`() {
        withServer(listOf(403)) { client, paths ->
            assertEquals(403, assertFailsWith<GeminiCallException> { fetch(client) }.httpStatus)
            assertEquals(1, paths.size)
            assertNull(budget.reserve())
        }
    }

    @Test fun `기존 배포의 당일 실패 횟수를 차감하고 남은 한 번은 보조모델에 사용한다`() {
        val day = Instant.now().atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDate()
        jdbc.update("INSERT INTO collection_circuits (id,failure_count) VALUES (?,2)", "briefing:$day")
        withServer(listOf(200)) { client, paths ->
            assertEquals("gemini-3.5-flash-lite", fetch(client).modelUsed)
            assertEquals(listOf("/v1beta/models/gemini-3.5-flash-lite:generateContent"), paths)
            assertNull(budget.reserve())
        }
    }

    @Test fun `동시 요청도 예산 세 번을 넘지 않고 다음 한국 날짜에 새 예산을 받는다`() {
        val now = Instant.parse("2026-10-21T14:59:00Z")
        val pool = Executors.newFixedThreadPool(6)
        try {
            val futures = (1..6).map { pool.submit<Int?> { budget.reserve(now) } }
            assertEquals(listOf(1, 2, 3), futures.mapNotNull { it.get() }.sorted())
            assertNull(GeminiCallBudget(jdbc, transaction).reserve(now))
            assertEquals(1, budget.reserve(now.plusSeconds(120)))
        } finally { pool.shutdownNow() }
    }
}
