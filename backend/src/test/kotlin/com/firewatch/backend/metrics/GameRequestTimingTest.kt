// 게임 계측의 비활성·예외 정리·스레드 격리와 SQL 비식별 로그를 검증한다.
package com.firewatch.backend.metrics

import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import java.util.concurrent.Executors
import kotlin.test.*

class GameRequestTimingTest {
    @Test fun `disabled scope passes through without creating metrics`() {
        assertEquals("result", GameRequestTiming(false).measure(GameTimingOperation.CURRENT) {
            assertNull(GameTimingScope.current.get())
            GameTimingScope.phase(GameTimingPhase.RULES) { "result" }
        })
        assertNull(GameTimingScope.current.get())
    }

    @Test fun `success and exception clear scope and logs contain no input or exception`() {
        val logger = LoggerFactory.getLogger(GameRequestTiming::class.java) as Logger
        val appender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(appender)
        try {
            val timing = GameRequestTiming(true)
            assertFailsWith<IllegalStateException> {
                timing.measure(GameTimingOperation.TRADE) {
                    GameTimingScope.phase(GameTimingPhase.RULES) { throw IllegalStateException("private-device-token-and-SQL") }
                }
            }
            assertNull(GameTimingScope.current.get())
            timing.measure(GameTimingOperation.CURRENT) {
                val listener = GameJdbcTimingListener()
                listener.jdbcExecuteStatementStart(); listener.jdbcExecuteStatementEnd()
                listener.jdbcExecuteBatchStart(); listener.jdbcExecuteBatchEnd()
            }
            assertNull(GameTimingScope.current.get())
            val messages = appender.list.map { it.formattedMessage }
            assertEquals(2, messages.size)
            assertTrue(messages[0].contains("op=TRADE outcome=failure"))
            assertTrue(messages[0].contains("rules_count=1"))
            assertTrue(messages[1].contains("op=CURRENT outcome=success"))
            assertTrue(messages[1].contains("sql_count=2"))
            assertTrue(messages[1].contains("rules_count=0"))
            assertFalse(messages.any { it.contains("private-device") || it.contains("token-and-SQL") })
        } finally { logger.detachAppender(appender); appender.stop() }
    }

    @Test fun `metrics are isolated from another JDBC thread and reset for next request`() {
        val executor = Executors.newSingleThreadExecutor()
        try {
            val timing = GameRequestTiming(true)
            timing.measure(GameTimingOperation.START) {
                val scope = GameTimingScope.current.get()!!
                executor.submit {
                    assertNull(GameTimingScope.current.get())
                    timing.measure(GameTimingOperation.HISTORY) {
                        val other = GameTimingScope.current.get()!!
                        assertNotSame(scope, other)
                        val listener = GameJdbcTimingListener()
                        listener.jdbcExecuteStatementStart(); listener.jdbcExecuteStatementEnd()
                        assertEquals(1, other.execute.count)
                    }
                    assertNull(GameTimingScope.current.get())
                }.get()
                assertEquals(0, scope.execute.count)
                timing.measure(GameTimingOperation.PREVIEW) { assertSame(scope, GameTimingScope.current.get()) }
                assertSame(scope, GameTimingScope.current.get())
            }
            timing.measure(GameTimingOperation.END) { assertEquals(0, GameTimingScope.current.get()!!.execute.count) }
            assertNull(GameTimingScope.current.get())
        } finally { executor.shutdownNow() }
    }
}
