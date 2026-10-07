package com.firewatch.backend.client

import com.firewatch.backend.service.FinancialDataService
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.net.InetSocketAddress
import java.time.LocalDate
import java.util.Collections
import kotlin.test.*

/** Real HTTP parsing and transport failures against an isolated local provider. */
class FinancialApiClientIsolationTest {
    private val requests = Collections.synchronizedList(mutableListOf<String>())
    private var response: (String) -> Pair<Int, String> = { 200 to "{}" }
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
        createContext("/") { exchange ->
            val path = exchange.requestURI.path
            requests.add(path)
            val (status, body) = response(path)
            val bytes = body.toByteArray()
            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(status, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        start()
    }
    private fun client(): FinancialApiClient {
        val base = "http://127.0.0.1:${server.address.port}"
        return FinancialApiClient(base, "test-exim-secret", base, base, "test-ecos-secret")
    }
    private val quote = """{"chart":{"result":[{"meta":{"regularMarketPrice":123.45}}]}}"""
    @AfterEach fun stop() { server.stop(0) }

    @Test fun `한 지수와 선택 국채 실패에도 나머지 다섯 지수를 보존한다`() {
        response = { path -> when {
            path.endsWith("^KQ11") -> 503 to "{}"
            path.startsWith("/api/StatisticSearch") -> 403 to "{}"
            else -> 200 to quote
        } }
        val result = client().fetchMarketIndices()
        assertNull(result.kosdaq)
        assertNull(result.krBondYield10y)
        listOf(result.kospi, result.sp500, result.nasdaq, result.dow, result.usBondYield10y)
            .forEach { assertEquals(BigDecimal("123.45"), it) }
        assertEquals(7, requests.size) // One per asset; no transport retries.
    }

    @Test fun `금 실패와 환율 실패가 은과 지수를 버리지 않는다`() {
        response = { path -> when {
            path.endsWith("GC=F") || path.contains("exchangeJSON") -> 503 to "{}"
            path.startsWith("/api/StatisticSearch") -> 200 to "{}"
            else -> 200 to quote
        } }
        val snapshot = FinancialDataService(client()).fetchLatestSnapshot()
        assertNull(snapshot.goldPrice)
        assertNull(snapshot.usdKrw)
        assertEquals(BigDecimal("123.45"), snapshot.silverPrice)
        assertEquals(BigDecimal("123.45"), snapshot.kospi)
        assertEquals(10, requests.size)
    }

    @Test fun `제공처가 모두 실패하면 빈 정상 스냅샷을 반환하지 않는다`() {
        response = { 503 to "{}" }
        val error = assertFailsWith<IllegalStateException> { FinancialDataService(client()).fetchLatestSnapshot() }
        assertFalse(error.toString().contains("secret"))
        assertEquals(10, requests.size)
    }

    @Test fun `환율 HTTP 오류에 인증키와 요청 URL을 노출하지 않는다`() {
        response = { 403 to "{}" }
        val error = assertFailsWith<IllegalStateException> { client().fetchExchangeRates(LocalDate.of(2026, 10, 8)) }
        assertEquals("한국수출입은행 API 호출 실패", error.message)
        assertNull(error.cause)
        assertEquals(1, requests.size)
    }
}
