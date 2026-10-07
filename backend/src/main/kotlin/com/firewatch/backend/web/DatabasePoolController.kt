package com.firewatch.backend.web

import com.zaxxer.hikari.HikariDataSource
import com.firewatch.backend.service.OperatorAccess
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
    private val operatorAccess: OperatorAccess,
) {
    // Counts only: never expose JDBC URLs, credentials or connection strings.
    @GetMapping("/api/operations/database-pool")
    fun get(@RequestHeader("X-API-Key", required = false) key: String?,
            @RequestHeader("X-Device-Id", required = false) deviceId: String?,
            @RequestHeader("Authorization", required = false) authorization: String?): DatabasePoolStatus {
        operatorAccess.requireOperator(deviceId, authorization, key)
        val pool = dataSource.unwrap(HikariDataSource::class.java)
        val counters = pool.hikariPoolMXBean
        return DatabasePoolStatus(pool.maximumPoolSize, pool.minimumIdle,
            counters?.activeConnections ?: 0, counters?.idleConnections ?: 0,
            counters?.totalConnections ?: 0, counters?.threadsAwaitingConnection ?: 0)
    }
}
