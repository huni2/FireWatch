package com.firewatch.backend.web

import com.zaxxer.hikari.HikariDataSource
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController
import javax.sql.DataSource

data class DatabasePoolStatus(
    val maximumConnections: Int,
    val minimumIdle: Int,
    val activeConnections: Int,
    val idleConnections: Int,
    val totalConnections: Int,
    val waitingRequests: Int,
)

@RestController
class DatabasePoolController(
    private val dataSource: DataSource,
    @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String,
) {
    // Counts only: never expose JDBC URLs, credentials or connection strings.
    @GetMapping("/api/operations/database-pool")
    fun get(@RequestHeader("X-API-Key", required = false) key: String?): DatabasePoolStatus {
        if (expectedApiKey.isBlank() || key != expectedApiKey) throw UnauthorizedException()
        val pool = dataSource.unwrap(HikariDataSource::class.java)
        val counters = pool.hikariPoolMXBean
        return DatabasePoolStatus(pool.maximumPoolSize, pool.minimumIdle,
            counters?.activeConnections ?: 0, counters?.idleConnections ?: 0,
            counters?.totalConnections ?: 0, counters?.threadsAwaitingConnection ?: 0)
    }
}
