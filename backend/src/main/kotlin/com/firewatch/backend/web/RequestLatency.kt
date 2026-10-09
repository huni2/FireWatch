package com.firewatch.backend.web

import com.firewatch.backend.service.OperatorAccess
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono
import java.util.ArrayDeque
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.ceil
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.annotation.Order
import org.slf4j.LoggerFactory

data class LatencySummary(val operation: String, val samples: Int, val p50Ms: Long, val p95Ms: Long, val failures: Int)

/** Bounded timings only: never record device IDs, symbols, query strings or response bodies. */
@Component
@Order(-200)
class RequestLatency(@Value("\${firewatch.game-timing.enabled:false}") private val gameTimingEnabled: Boolean = false) : WebFilter {
    private data class Sample(val millis: Long, val failed: Boolean)
    private val samples = ConcurrentHashMap<String, ArrayDeque<Sample>>()
    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val path = exchange.request.path.value()
        val operation = when {
            path.startsWith("/api/game/") && path.substringAfterLast('/') in listOf("start", "trade", "next-turn", "current", "preview", "end") -> "game." + path.substringAfterLast('/')
            path == "/api/portfolio" -> "portfolio"
            path == "/api/news" -> "news"
            path.startsWith("/api/briefings") -> "briefings"
            path.startsWith("/api/recommendations") -> "recommendations"
            path.startsWith("/api/stocks/") && path.endsWith("/history") -> "stock.history"
            path == "/api/stocks/search" -> "stock.search"
            else -> null
        } ?: return chain.filter(exchange)
        val key = "${exchange.request.method.name()} $operation"
        val start = System.nanoTime()
        val phases = if (gameTimingEnabled && operation.startsWith("game.")) GameHttpPhases(start).also {
            exchange.attributes[GameHttpPhases.ATTRIBUTE] = it
        } else null
        exchange.response.beforeCommit {
            val finished = System.nanoTime()
            val extra = phases?.header(finished).orEmpty()
            exchange.response.headers.set("Server-Timing", "application;dur=${(finished - start) / 1_000_000}" + if (extra.isEmpty()) "" else ", $extra")
            phases?.let { log.info("game_http_timing op={} status={} {}", operation.substringAfter('.').uppercase(java.util.Locale.ROOT),
                exchange.response.statusCode?.value() ?: 200, it.fields(finished)) }
            Mono.empty()
        }
        return chain.filter(exchange).doFinally {
            val queue = samples.computeIfAbsent(key) { ArrayDeque() }
            synchronized(queue) {
                if (queue.size >= 256) queue.removeFirst()
                queue.addLast(Sample((System.nanoTime() - start) / 1_000_000, (exchange.response.statusCode?.value() ?: 200) >= 500))
            }
        }
    }
    fun summaries(): List<LatencySummary> = samples.entries.map { (key, queue) ->
        val rows = synchronized(queue) { queue.toList() }
        val times = rows.map { it.millis }.sorted()
        fun percentile(p: Double) = times.getOrElse((ceil(times.size * p).toInt() - 1).coerceAtLeast(0)) { 0 }
        LatencySummary(key, rows.size, percentile(.5), percentile(.95), rows.count { it.failed })
    }.sortedBy { it.operation }
    private val log = LoggerFactory.getLogger(RequestLatency::class.java)
}

@RestController
class LatencyController(private val latency: RequestLatency, private val operatorAccess: OperatorAccess) {
    @GetMapping("/api/operations/latency")
    fun get(@RequestHeader("X-API-Key", required = false) key: String?,
            @RequestHeader("X-Device-Id", required = false) deviceId: String?,
            @RequestHeader("Authorization", required = false) authorization: String?): List<LatencySummary> {
        operatorAccess.requireOperator(deviceId, authorization, key)
        return latency.summaries()
    }
}
