// 게임 규칙 버전 컬럼의 기존 행 이전과 반복 실행 보존을 전용 시험 DB에서 검증한다.
package com.firewatch.backend.service

import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import java.sql.DriverManager
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GameSimulationVersionMigrationTest {
    @Test
    fun `H2 migrates existing game without altering its saved ledger`() {
        verifyMigration("jdbc:h2:mem:game-version-${UUID.randomUUID()}", "sa", "", "h2")
    }

    @Test
    fun `PostgreSQL migrates existing game without altering its saved ledger`() {
        val url = System.getenv("FIREWATCH_TEST_POSTGRES_URL")
        assumeTrue(url != null, "전용 PostgreSQL CI에서 실행한다.")
        require(Regex("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/firewatch_test").matches(url!!))
        verifyMigration(url, "firewatch_test", "firewatch_test", "postgresql")
    }

    private fun verifyMigration(url: String, user: String, password: String, platform: String) {
        val ddl = javaClass.getResource("/portfolio-$platform.sql")!!.readText()
            .lineSequence().single { it.startsWith("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS simulation_version ") }
        DriverManager.getConnection(url, user, password).use { connection ->
            connection.autoCommit = false
            try {
                connection.createStatement().use { statement ->
                    if (platform == "postgresql") {
                        // 전용 임시 스키마 안에서만 DDL을 실행하고 전체 트랜잭션을 롤백한다.
                        val schema = "game_version_" + UUID.randomUUID().toString().replace("-", "")
                        statement.execute("CREATE SCHEMA $schema")
                        statement.execute("SET LOCAL search_path TO $schema")
                    }
                    statement.execute("CREATE TABLE game_sessions (id BIGINT PRIMARY KEY, simulation_seed BIGINT, turn_dates VARCHAR(2000), current_turn_index INT)")
                    statement.execute("CREATE TABLE game_transactions (session_id BIGINT REFERENCES game_sessions(id), price DECIMAL(20,4), quantity DECIMAL(20,4))")
                    statement.execute("INSERT INTO game_sessions VALUES (1,42,'2030-02-01,2030-01-01',1),(2,NULL,'2026-10-01',0)")
                    statement.execute("INSERT INTO game_transactions VALUES (1,24000.0000,10.0000)")
                    statement.execute(ddl)
                    statement.executeQuery("SELECT simulation_version FROM game_sessions ORDER BY id").use { result ->
                        repeat(2) { assertTrue(result.next()); assertEquals(1, result.getInt(1)) }
                    }
                    statement.execute("UPDATE game_sessions SET simulation_version=999 WHERE id=1")
                    statement.execute(ddl)
                    statement.execute("INSERT INTO game_sessions (id,simulation_seed,current_turn_index) VALUES (3,123,0)")
                    statement.executeQuery("SELECT simulation_seed,turn_dates,current_turn_index,simulation_version FROM game_sessions WHERE id=1").use { result ->
                        assertTrue(result.next())
                        assertEquals(42L, result.getLong(1))
                        assertEquals("2030-02-01,2030-01-01", result.getString(2))
                        assertEquals(1, result.getInt(3))
                        assertEquals(999, result.getInt(4))
                    }
                    statement.executeQuery("SELECT simulation_version FROM game_sessions WHERE id=3").use { result ->
                        assertTrue(result.next()); assertEquals(1, result.getInt(1))
                    }
                    statement.executeQuery("SELECT price,quantity FROM game_transactions WHERE session_id=1").use { result ->
                        assertTrue(result.next())
                        assertEquals("24000.0000", result.getBigDecimal(1).toPlainString())
                        assertEquals("10.0000", result.getBigDecimal(2).toPlainString())
                    }
                }
            } finally {
                connection.rollback()
            }
        }
    }
}
