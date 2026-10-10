// 백업 보고 API의 인증·입력 제한과 실패 알림 재시도 보존을 실제 DB/HTTP로 검증한다.
package com.firewatch.backend.web

import com.firewatch.backend.service.*
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.UserSettingsRepository
import io.mockk.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.reactive.server.WebTestClient
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = [
    "spring.datasource.url=jdbc:h2:mem:backup-report;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-",
    "firewatch.market.collection-cron=-", "firewatch.operator.api-key=backup-report-test-key"])
class BackupReportIntegrationTest {
    @LocalServerPort var port = 0
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var reports: BackupReportService
    @Autowired lateinit var settings: UserSettingsRepository
    companion object {
        @JvmStatic @DynamicPropertySource fun database(registry: DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").responseTimeout(Duration.ofSeconds(20)).build()
    @Test fun `외부 보고는 비밀 키가 필요하고 입력에 원문 예외나 DB 주소를 허용하지 않는다`() {
        val path = "/api/operations/backup/report"
        val request = BackupReportInput("100-1", "DUMP_FAILED")
        client().post().uri(path).bodyValue(request).exchange().expectStatus().isUnauthorized
        client().post().uri(path).header("X-API-Key", "public-key").bodyValue(request).exchange().expectStatus().isUnauthorized
        listOf(BackupReportInput("'SQL'", "DUMP_FAILED"), BackupReportInput("100-1", "postgres://private-password")) .forEach {
            client().post().uri(path).header("X-API-Key", "backup-report-test-key").bodyValue(it).exchange().expectStatus().isBadRequest
        }
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM collection_alerts WHERE id='backup:100-1'", Int::class.java))
    }
    @Test fun `실패 보고 중복은 재시도 횟수를 초기화하지 않고 성공 보고는 장애를 해제한다`() {
        jdbc.update("DELETE FROM collection_alerts WHERE category='backup'")
        val request = BackupReportInput("200-1", "ENCRYPT_FAILED")
        fun post(body: BackupReportInput) = client().post().uri("/api/operations/backup/report")
            .header("X-API-Key", "backup-report-test-key").bodyValue(body).exchange().expectStatus().isOk
        post(request)
        jdbc.update("UPDATE collection_alerts SET push_attempts=3 WHERE id='backup:200-1'")
        post(request)
        assertEquals(3, jdbc.queryForObject("SELECT push_attempts FROM collection_alerts WHERE id='backup:200-1'", Int::class.java))
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM collection_alerts WHERE id='backup:200-1'", Int::class.java))
        post(BackupReportInput("201-1"))
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM collection_alerts WHERE category='backup' AND resolved_at IS NULL", Int::class.java))
        val audit = jdbc.query("SELECT request_payload FROM audit_logs WHERE action_name='OperatorAccess.requireOperator'", { r, _ -> r.getString(1) ?: "" }).joinToString()
        assertFalse(audit.contains("backup-report-test-key"))
    }
    @Test fun `백업 실패 알림은 백업 제목 경로로 최대 세 번만 발송한다`() {
        jdbc.update("DELETE FROM collection_alerts WHERE category='backup'")
        val owner = settings.save(UserSettings(fcmTokensRaw = "backup-test-token"))
        jdbc.update("DELETE FROM collection_operator")
        jdbc.update("INSERT INTO collection_operator(id,settings_id) VALUES(1,?)", owner.id)
        val push = mockk<PushService>()
        every { push.notifyBackupFailure(any(), any()) } throws IllegalStateException("provider private URL")
        val now = Instant.parse("2026-10-10T12:00:00Z")
        reports.record(BackupReportInput("300-1", "DUMP_FAILED"), now)
        val worker = OperationsPushService(jdbc, settings, push)
        listOf(0L,1L,3599L,3600L,7200L,10800L).forEach { worker.flush(now.plusSeconds(it)) }
        verify(exactly = 3) { push.notifyBackupFailure(any(), any()) }
        verify(exactly = 0) { push.notifyOperator(any(), any()) }
        assertEquals(3, jdbc.queryForObject("SELECT push_attempts FROM collection_alerts WHERE id='backup:300-1'", Int::class.java))
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM audit_logs WHERE action_name='backup.operatorPush'", Int::class.java))
        jdbc.update("DELETE FROM collection_operator")
    }
}
