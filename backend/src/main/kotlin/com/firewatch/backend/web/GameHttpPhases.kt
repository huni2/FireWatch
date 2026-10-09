// 게임 요청의 인증·컨트롤러 전후 구간을 요청 객체 안에서만 비식별로 측정한다.
package com.firewatch.backend.web

import org.springframework.web.server.ServerWebExchange
import java.util.Locale

internal class GameHttpPhases(val startedAt: Long = System.nanoTime()) {
    @Volatile var authQueuedAt: Long? = null
    @Volatile var authEnteredAt: Long? = null
    @Volatile var authFinishedAt: Long? = null
    @Volatile var controllerEnteredAt: Long? = null
    @Volatile var controllerFinishedAt: Long? = null

    private fun durations(finishedAt: Long): List<Pair<String, String>> {
        fun millis(start: Long?, end: Long?): String = if (start == null || end == null) "unavailable"
            else String.format(Locale.ROOT, "%.3f", (end - start).coerceAtLeast(0) / 1_000_000.0)
        return listOf("request" to millis(startedAt, finishedAt),
            "auth_queue" to millis(authQueuedAt, authEnteredAt), "auth" to millis(authEnteredAt, authFinishedAt),
            "dispatch" to millis(authFinishedAt ?: startedAt, controllerEnteredAt),
            "controller" to millis(controllerEnteredAt, controllerFinishedAt),
            "response" to millis(controllerFinishedAt, finishedAt))
    }

    fun fields(finishedAt: Long = System.nanoTime()) = durations(finishedAt).joinToString(" ") { (name, value) -> "${name}_ms=$value" }
    fun header(finishedAt: Long = System.nanoTime()) = durations(finishedAt)
        .filter { (name, value) -> name != "request" && value != "unavailable" }
        .joinToString(", ") { (name, value) -> "$name;dur=$value" }

    companion object {
        const val ATTRIBUTE = "firewatch.game.http.phases"
        fun from(exchange: ServerWebExchange): GameHttpPhases? = exchange.getAttribute(ATTRIBUTE)
    }
}
