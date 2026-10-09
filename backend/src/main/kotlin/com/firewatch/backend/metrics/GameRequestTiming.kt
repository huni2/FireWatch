// 게임 요청의 큐·JDBC 구간만 비식별 서버 로그로 측정하고 요청 종료 시 정리한다.
package com.firewatch.backend.metrics

import org.hibernate.SessionEventListener
import org.hibernate.cfg.SessionEventSettings
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer
import org.springframework.context.annotation.Configuration
import org.springframework.stereotype.Component
import java.lang.management.ManagementFactory
import java.util.Locale

enum class GameTimingOperation { START, CURRENT, TRADE, PREVIEW, NEXT_TURN, END, HISTORY }

internal class JdbcSpan {
    var nanos = 0L
    var count = 0
    fun add(start: Long) { nanos += System.nanoTime() - start; count++ }
    fun millis() = String.format(Locale.ROOT, "%.3f", nanos / 1_000_000.0)
}

internal class GameTimingRecord {
    val connection = JdbcSpan()
    val prepare = JdbcSpan()
    val execute = JdbcSpan()
}

internal object GameTimingScope {
    val current = ThreadLocal<GameTimingRecord>()
}

@Component
class GameRequestTiming(@Value("\${firewatch.game-timing.enabled:false}") private val enabled: Boolean) {
    fun <T> measure(operation: GameTimingOperation, queuedAt: Long = System.nanoTime(), block: () -> T): T {
        if (!enabled || GameTimingScope.current.get() != null) return block()
        val enteredAt = System.nanoTime()
        val record = GameTimingRecord()
        GameTimingScope.current.set(record)
        var outcome = "failure"
        try {
            return block().also { outcome = "success" }
        } finally {
            GameTimingScope.current.remove()
            log.info(
                "game_timing op={} outcome={} server_ms={} io_queue_ms={} connection_ms={} connection_count={} prepare_ms={} sql_ms={} sql_count={} uptime_ms={}",
                operation.name, outcome, millis(System.nanoTime() - queuedAt), millis(enteredAt - queuedAt),
                record.connection.millis(), record.connection.count, record.prepare.millis(),
                record.execute.millis(), record.execute.count, ManagementFactory.getRuntimeMXBean().uptime,
            )
        }
    }

    private fun millis(nanos: Long) = String.format(Locale.ROOT, "%.3f", nanos / 1_000_000.0)
    private val log = LoggerFactory.getLogger(GameRequestTiming::class.java)
}

// Hibernate는 세션마다 이 인스턴스를 만들며 활성 게임 요청 밖에서는 시간을 수집하지 않는다.
class GameJdbcTimingListener : SessionEventListener {
    private var connectionStart: Long? = null
    private var prepareStart: Long? = null
    private var executeStart: Long? = null
    private fun start() = if (GameTimingScope.current.get() != null) System.nanoTime() else null
    override fun jdbcConnectionAcquisitionStart() { connectionStart = start() }
    override fun jdbcConnectionAcquisitionEnd() {
        connectionStart?.let { GameTimingScope.current.get()?.connection?.add(it) }
        connectionStart = null
    }
    override fun jdbcPrepareStatementStart() { prepareStart = start() }
    override fun jdbcPrepareStatementEnd() {
        prepareStart?.let { GameTimingScope.current.get()?.prepare?.add(it) }
        prepareStart = null
    }
    override fun jdbcExecuteStatementStart() { executeStart = start() }
    override fun jdbcExecuteStatementEnd() {
        executeStart?.let { GameTimingScope.current.get()?.execute?.add(it) }
        executeStart = null
    }
    override fun jdbcExecuteBatchStart() = jdbcExecuteStatementStart()
    override fun jdbcExecuteBatchEnd() = jdbcExecuteStatementEnd()
}

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = ["firewatch.game-timing.enabled"], havingValue = "true")
class GameJdbcTimingConfiguration : HibernatePropertiesCustomizer {
    override fun customize(hibernateProperties: MutableMap<String, Any>) {
        hibernateProperties[SessionEventSettings.AUTO_SESSION_EVENTS_LISTENER] = GameJdbcTimingListener::class.java.name
    }
}
