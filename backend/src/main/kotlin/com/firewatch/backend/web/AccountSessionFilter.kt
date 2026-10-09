package com.firewatch.backend.web

import com.firewatch.backend.repository.AuthSessions
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import reactor.core.publisher.Mono
import reactor.core.scheduler.Schedulers
import org.springframework.core.annotation.Order

/** Anonymous devices remain usable; linked private data requires proof beyond a device UUID. */
@Component
@Order(-100)
class AccountSessionFilter(private val sessions: AuthSessions) : WebFilter {
    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val path = exchange.request.path.value()
        val protected = path == "/api/portfolio" || path == "/api/settings" || path == "/api/collection/operator" ||
            (path.startsWith("/api/game/") && !path.startsWith("/api/game/rankings")) ||
            (path.startsWith("/api/auth/") && path != "/api/auth/google/link")
        val deviceId = exchange.request.headers.getFirst("X-Device-Id")
        if (!protected || deviceId == null || exchange.request.method.name() == "OPTIONS") return chain.filter(exchange)
        val phases = GameHttpPhases.from(exchange)
        phases?.authQueuedAt = System.nanoTime()
        return Mono.fromCallable {
            phases?.authEnteredAt = System.nanoTime()
            try {
                if (path.startsWith("/api/auth/") || sessions.linkedUser(deviceId) != null)
                    sessions.authenticate(deviceId, exchange.request.headers.getFirst("Authorization"))
                true
            } finally { phases?.authFinishedAt = System.nanoTime() }
        }.subscribeOn(Schedulers.boundedElastic()).flatMap { chain.filter(exchange) }
            .onErrorResume(UnauthorizedException::class.java) {
                exchange.response.statusCode = HttpStatus.UNAUTHORIZED
                exchange.response.headers.contentType = MediaType.APPLICATION_JSON
                val body = """{"error":{"code":"UNAUTHORIZED","message":"Google 계정으로 다시 로그인해주세요."}}"""
                exchange.response.writeWith(Mono.just(exchange.response.bufferFactory().wrap(body.toByteArray())))
            }
    }
}
