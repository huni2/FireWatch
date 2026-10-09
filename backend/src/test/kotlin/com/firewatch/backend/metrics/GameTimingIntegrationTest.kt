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
    @org.springframework.beans.factory.annotation.Autowired
    lateinit var preparation: com.firewatch.backend.web.GameRuntimePreparation
    private val logger = LoggerFactory.getLogger(GameRequestTiming::class.java) as Logger
    private lateinit var appender: ListAppender<ILoggingEvent>
    private val httpLogger = LoggerFactory.getLogger(com.firewatch.backend.web.RequestLatency::class.java) as Logger
    private lateinit var httpAppender: ListAppender<ILoggingEvent>
    @BeforeEach fun attach() {
        appender = ListAppender<ILoggingEvent>().apply { start() }; logger.addAppender(appender)
        httpAppender = ListAppender<ILoggingEvent>().apply { start() }; httpLogger.addAppender(httpAppender)
    }
    @AfterEach fun detach() {
        logger.detachAppender(appender); appender.stop()
        httpLogger.detachAppender(httpAppender); httpAppender.stop()
    }
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
    private fun start(device: String) = client().post().uri("/api/game/start?compact=true").header("X-Device-Id", device)
        .exchange().expectStatus().isOk.expectHeader().valueMatches("Server-Timing", "application;dur=\\d+, auth_queue;dur=.+")
        .expectBody(GameTurnResponse::class.java).returnResult().responseBody!!
    private fun messages() = appender.list.map { it.formattedMessage }
    private fun sqlCount(message: String) = Regex("sql_count=(\\d+)").find(message)!!.groupValues[1].toInt()

    @Test fun `preview measures binding boundary and rejects invalid quantity before controller`() {
        assertTrue(preparation.prepared, "HTTP must start after game runtime preparation")
        val device = UUID.randomUUID().toString()
        val turn = start(device)
        val body = com.firewatch.backend.web.dto.GameTradeRequest(
            instrumentType = com.firewatch.backend.entity.GameInstrumentType.GOLD,
            action = com.firewatch.backend.entity.GameTradeAction.BUY,
            quantity = java.math.BigDecimal.ONE, expectedTurnIndex = turn.turnIndex,
        )
        client().post().uri("/api/game/preview").header("X-Device-Id", device).bodyValue(body)
            .exchange().expectStatus().isOk.expectHeader().valueMatches("Server-Timing", ".*dispatch;dur=.+controller;dur=.+response;dur=.+")
        val success = httpAppender.list.map { it.formattedMessage }.last { it.contains("op=PREVIEW") }
        assertTrue(success.contains("status=200"))
        assertTrue(Regex("dispatch_ms=\\d+\\.\\d+").containsMatchIn(success))
        client().post().uri("/api/game/preview").header("X-Device-Id", device).bodyValue(body.copy(quantity = java.math.BigDecimal.ZERO))
            .exchange().expectStatus().isBadRequest
        val failure = httpAppender.list.map { it.formattedMessage }.last { it.contains("op=PREVIEW") }
        assertTrue(failure.contains("status=400"))
        assertTrue(failure.contains("controller_ms=unavailable"), failure)
        assertFalse(failure.contains(device))
    }

    @Test fun `Hibernate events report actual JDBC work and game reads preserve saved state`() {
        val device = UUID.randomUUID().toString()
        val started = start(device)
        val first = messages().last()
        assertTrue(first.contains("op=START outcome=success"))
        assertTrue(first.contains("repository_count=2"), first)
        // Session lock lookup + new session INSERT + durable audit INSERT; no empty ledger SELECT.
        assertEquals(3, sqlCount(first))
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
        val history = client().get().uri("/api/game/sessions/${started.sessionId}/assets/history?turnIndex=0&instrumentType=GOLD")
            .header("X-Device-Id", device).exchange().expectStatus().isOk
            .expectBody(com.firewatch.backend.web.GameAssetHistoryResponse::class.java).returnResult().responseBody!!
        assertEquals(1, history.history.points.size)
        val historyLog = messages().last()
        assertTrue(historyLog.contains("op=HISTORY outcome=success"))
        assertTrue(historyLog.contains("repository_count=1"))
        assertTrue(historyLog.contains("rules_count=1"))
        assertTrue(historyLog.contains("history_count=1"))
        assertEquals(1, sqlCount(historyLog))
        assertFalse(messages().any { it.contains(device) || it.contains("select ", true) || it.contains("insert ", true) })
        val httpMessages = httpAppender.list.map { it.formattedMessage }
        val startHttp = httpMessages.first { it.contains("op=START") }
        for (field in listOf("auth_queue_ms", "auth_ms", "dispatch_ms", "controller_ms", "response_ms")) {
            assertTrue(Regex("$field=\\d+\\.\\d+").containsMatchIn(startHttp), startHttp)
        }
        assertFalse(httpMessages.any { it.contains(device) || it.contains("select ", true) || it.contains("token", true) })
    }

    @Test fun `failed history request is timed without leaking identifiers or contaminating next request`() {
        val device = UUID.randomUUID().toString()
        val turn = start(device)
        client().get().uri("/api/game/sessions/${turn.sessionId}/assets/history?turnIndex=24&instrumentType=GOLD")
            .header("X-Device-Id", device).exchange().expectStatus().isBadRequest
        val failure = messages().last()
        assertTrue(failure.contains("op=HISTORY outcome=failure"))
        assertTrue(sqlCount(failure) > 0)
        assertTrue(failure.contains("repository_count=1"))
        assertTrue(failure.contains("rules_count=0"))
        assertTrue(failure.contains("history_count=0"))
        client().get().uri("/api/game/current?compact=true").exchange().expectStatus().isBadRequest
        val next = messages().last()
        assertTrue(next.contains("op=CURRENT outcome=failure"))
        assertEquals(0, sqlCount(next))
        assertFalse(messages().any { it.contains(device) || it.contains("진행한 턴") })
    }

    @Test fun `trade shares one ledger read and retries preserve holdings cash and conflict checks`() {
        val device = UUID.randomUUID().toString()
        val initial = start(device)
        val request = com.firewatch.backend.web.dto.GameTradeRequest(
            com.firewatch.backend.entity.GameInstrumentType.GOLD, action = com.firewatch.backend.entity.GameTradeAction.BUY,
            quantity = java.math.BigDecimal.ONE, requestId = "shared-ledger", expectedTurnIndex = 0,
        )
        fun trade(body: com.firewatch.backend.web.dto.GameTradeRequest) = client().post().uri("/api/game/trade?compact=true")
            .header("X-Device-Id", device).bodyValue(body).exchange()
        fun assertBalances(expected: GameTurnResponse, actual: GameTurnResponse) {
            fun ledger(turn: GameTurnResponse) = turn.transactions.map {
                it.copy(quantity = it.quantity.stripTrailingZeros(), price = it.price.stripTrailingZeros(), total = it.total.stripTrailingZeros())
            }
            fun holdings(turn: GameTurnResponse) = turn.holdings.map {
                it.copy(quantity = it.quantity.stripTrailingZeros(), currentPrice = it.currentPrice?.stripTrailingZeros(), value = it.value?.stripTrailingZeros())
            }
            assertEquals(ledger(expected), ledger(actual))
            assertEquals(holdings(expected), holdings(actual))
            assertEquals(0, expected.cash.compareTo(actual.cash))
        }
        val bought = trade(request).expectStatus().isOk.expectBody(GameTurnResponse::class.java).returnResult().responseBody!!
        assertEquals(4, sqlCount(messages().last()))
        assertEquals(1, bought.transactions.size)
        assertEquals(0, java.math.BigDecimal.ONE.compareTo(bought.holdings.single().quantity))
        assertTrue(bought.cash < initial.cash)
        val replay = trade(request.copy(expectedTurnIndex = 23)).expectStatus().isOk
            .expectBody(GameTurnResponse::class.java).returnResult().responseBody!!
        assertEquals(3, sqlCount(messages().last()))
        assertBalances(bought, replay)
        trade(request.copy(quantity = java.math.BigDecimal.TEN)).expectStatus().isEqualTo(409)
        val resumed = start(device)
        assertEquals(initial.sessionId, resumed.sessionId)
        assertBalances(bought, resumed)
    }
}
