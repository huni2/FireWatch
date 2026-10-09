// 게임 HTTP 구간의 누락 값·옵션·인증 실패·식별자 비노출을 검증한다.
package com.firewatch.backend.web

import com.firewatch.backend.repository.AuthSessions
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Test
import org.springframework.mock.http.server.reactive.MockServerHttpRequest
import org.springframework.mock.web.server.MockServerWebExchange
import org.springframework.web.server.WebFilterChain
import kotlin.test.*

class GameHttpPhasesTest {
    @Test fun `known boundaries separate authentication dispatch controller and response`() {
        val phases = GameHttpPhases(0)
        phases.authQueuedAt = 1_000_000
        phases.authEnteredAt = 3_000_000
        phases.authFinishedAt = 8_000_000
        phases.controllerEnteredAt = 11_000_000
        phases.controllerFinishedAt = 18_000_000
        assertEquals("request_ms=20.000 auth_queue_ms=2.000 auth_ms=5.000 dispatch_ms=3.000 controller_ms=7.000 response_ms=2.000", phases.fields(20_000_000))
        assertEquals("auth_queue;dur=2.000, auth;dur=5.000, dispatch;dur=3.000, controller;dur=7.000, response;dur=2.000", phases.header(20_000_000))
        assertEquals("", GameHttpPhases(0).header(20_000_000))
        assertTrue(GameHttpPhases(0).fields(20_000_000).contains("auth_ms=unavailable"))
        assertTrue(GameHttpPhases(0).fields(20_000_000).contains("controller_ms=unavailable"))
    }

    @Test fun `disabled diagnostics retain application header without allocating phases`() {
        val exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/game/current"))
        RequestLatency(false).filter(exchange, WebFilterChain { it.response.setComplete() }).block()
        assertNull(GameHttpPhases.from(exchange))
        assertTrue(exchange.response.headers.getFirst("Server-Timing")!!.startsWith("application;dur="))
    }

    @Test fun `rejected linked device records authentication completion and still returns 401`() {
        val sessions = mockk<AuthSessions>()
        every { sessions.linkedUser("private-device") } returns 1L
        every { sessions.authenticate("private-device", "Bearer private-token", any()) } throws UnauthorizedException()
        val exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/api/game/preview")
            .header("X-Device-Id", "private-device").header("Authorization", "Bearer private-token"))
        var reached = false
        val auth = AccountSessionFilter(sessions)
        RequestLatency(true).filter(exchange, WebFilterChain { auth.filter(it, WebFilterChain { inner ->
            reached = true; inner.response.setComplete()
        }) }).block()
        assertFalse(reached)
        assertEquals(401, exchange.response.statusCode!!.value())
        val phases = GameHttpPhases.from(exchange)!!
        assertNotNull(phases.authFinishedAt)
        assertNull(phases.controllerEnteredAt)
        assertFalse(phases.fields().contains("private"))
        assertTrue(exchange.response.headers.getFirst("Server-Timing")!!.startsWith("application;dur="))
    }
}
