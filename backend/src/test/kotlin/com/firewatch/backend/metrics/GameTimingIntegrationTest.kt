// 실제 JPA와 게임 HTTP 요청에서 JDBC 시간 집계·원장 유지·실패 정리를 검증한다.
package com.firewatch.backend.metrics

import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import com.firewatch.backend.web.TestDatabase
import com.firewatch.backend.web.dto.GameTurnResponse
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import java.util.UUID
import kotlin.test.*

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = [
    "spring.datasource.url=jdbc:h2:mem:game-timing;DB_CLOSE_DELAY=-1", "firewatch.game-timing.enabled=true",
])
class GameTimingIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @LocalServerPort var port = 0
    private val logger = LoggerFactory.getLogger(GameRequestTiming::class.java) as Logger
    private lateinit var appender: ListAppender<ILoggingEvent>
    @BeforeEach fun attach() { appender = ListAppender<ILoggingEvent>().apply { start() }; logger.addAppender(appender) }
    @AfterEach fun detach() { logger.detachAppender(appender); appender.stop() }
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
    private fun start(device: String) = client().post().uri("/api/game/start?compact=true").header("X-Device-Id", device)
        .exchange().expectStatus().isOk.expectBody(GameTurnResponse::class.java).returnResult().responseBody!!
    private fun messages() = appender.list.map { it.formattedMessage }
    private fun sqlCount(message: String) = Regex("sql_count=(\\d+)").find(message)!!.groupValues[1].toInt()

    @Test fun `Hibernate events report actual JDBC work and game reads preserve saved state`() {
        val device = UUID.randomUUID().toString()
        val started = start(device)
        val first = messages().last()
        assertTrue(first.contains("op=START outcome=success"))
        assertTrue(sqlCount(first) > 0)
        assertTrue(Regex("connection_count=([1-9][0-9]*)").containsMatchIn(first))
        val current = client().get().uri("/api/game/current?compact=true").header("X-Device-Id", device)
            .exchange().expectStatus().isOk.expectBody(GameTurnResponse::class.java).returnResult().responseBody!!
        assertEquals(started.sessionId, current.sessionId)
        assertEquals(0, started.cash.compareTo(current.cash))
        assertEquals(started.stockPrices, current.stockPrices)
        assertEquals(started.transactions, current.transactions)
        val read = messages().last()
        assertTrue(read.contains("op=CURRENT outcome=success"))
        assertTrue(sqlCount(read) > 0)
        assertFalse(messages().any { it.contains(device) || it.contains("select ", true) || it.contains("insert ", true) })
    }

    @Test fun `failed history request is timed without leaking identifiers or contaminating next request`() {
        val device = UUID.randomUUID().toString()
        val turn = start(device)
        client().get().uri("/api/game/sessions/${turn.sessionId}/assets/history?turnIndex=24&instrumentType=GOLD")
            .header("X-Device-Id", device).exchange().expectStatus().isBadRequest
        val failure = messages().last()
        assertTrue(failure.contains("op=HISTORY outcome=failure"))
        assertTrue(sqlCount(failure) > 0)
        client().get().uri("/api/game/current?compact=true").exchange().expectStatus().isBadRequest
        val next = messages().last()
        assertTrue(next.contains("op=CURRENT outcome=failure"))
        assertEquals(0, sqlCount(next))
        assertFalse(messages().any { it.contains(device) || it.contains("진행한 턴") })
    }
}
