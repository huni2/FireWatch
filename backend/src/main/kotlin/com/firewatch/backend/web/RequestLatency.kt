package com.firewatch.backend.web

import org.springframework.beans.factory.annotation.Value
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

data class LatencySummary(val operation: String, val samples: Int, val p50Ms: Long, val p95Ms: Long, val failures: Int)

/** Bounded timings only: never record device IDs, symbols, query strings or response bodies. */
@Component
class RequestLatency : WebFilter {
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
        exchange.response.beforeCommit {
            exchange.response.headers.set("Server-Timing", "application;dur=${(System.nanoTime() - start) / 1_000_000}")
            Mono.empty()
        }
        return chain.filter(exchange).doFinally {
            val queue = samples.computeIfAbsent(key) { ArrayDeque() }
            synchronized(queue) {
                if (queue.size >= 256) queue.removeFirst()
                queue.addLast(Sample((System.nanoTime() - start) / 1_000_000, (exchange.response.statusCode?.value() ?: 500) >= 500))
            }
        }
    }
    fun summaries(): List<LatencySummary> = samples.entries.map { (key, queue) ->
        val rows = synchronized(queue) { queue.toList() }
        val times = rows.map { it.millis }.sorted()
        fun percentile(p: Double) = times.getOrElse((ceil(times.size * p).toInt() - 1).coerceAtLeast(0)) { 0 }
        LatencySummary(key, rows.size, percentile(.5), percentile(.95), rows.count { it.failed })
    }.sortedBy { it.operation }
}

@RestController
class LatencyController(private val latency: RequestLatency, @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String) {
    @GetMapping("/api/operations/latency")
    fun get(@RequestHeader("X-API-Key", required = false) key: String?): List<LatencySummary> {
        if (expectedApiKey.isBlank() || key != expectedApiKey) throw UnauthorizedException()
        return latency.summaries()
    }
}
