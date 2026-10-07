package com.firewatch.backend.web

import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.repository.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import kotlin.test.*

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:community-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.operator.api-key=community-operator"])
class CommunityIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @LocalServerPort var port = 0
    @Autowired lateinit var users: AppUserRepository
    @Autowired lateinit var links: DeviceLinkRepository
    @Autowired lateinit var sessions: AuthSessions
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var settings: UserSettingsRepository
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
    private fun login(email: String = "test@example.com"): Pair<String, String> {
        val device = UUID.randomUUID().toString()
        val account = users.save(AppUser(googleSub = device, email = email, emailVerified = true))
        links.save(DeviceLink(device, account.id!!))
        return device to "Bearer ${sessions.issue(device).token}"
    }

    @Test fun `문의는 본인만 읽고 재전송은 동일 접수이며 일반 계정은 관리하지 못한다`() {
        val (device, auth) = login()
        val input = FeedbackInput(UUID.randomUUID().toString(), "BUG", "다음 턴 버튼을 눌렀을 때 오류가 발생합니다", "WEB")
        client().post().uri("/api/community/feedback").bodyValue(input).exchange().expectStatus().isUnauthorized
        val row = client().post().uri("/api/community/feedback").header("X-Device-Id", device).header("Authorization", auth).bodyValue(input).exchange().expectStatus().isOk.expectBody(FeedbackView::class.java).returnResult().responseBody!!
        client().post().uri("/api/community/feedback").header("X-Device-Id", device).header("Authorization", auth).bodyValue(input).exchange().expectStatus().isOk.expectBody().jsonPath("$.id").isEqualTo(row.id)
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM user_feedback WHERE id=?", Int::class.java, row.id))
        val (other, otherAuth) = login()
        client().get().uri("/api/community/feedback").header("X-Device-Id", other).header("Authorization", otherAuth).exchange().expectStatus().isOk.expectBody().json("[]")
        client().get().uri("/api/community/operator/feedback").header("X-Device-Id", device).header("Authorization", auth).exchange().expectStatus().isForbidden
        client().get().uri("/api/community/operator/notices").exchange().expectStatus().isUnauthorized
        client().put().uri("/api/community/operator/feedback/${row.id}").header("X-Device-Id", device).header("Authorization", auth).bodyValue(FeedbackUpdate("RESOLVED", "답변")).exchange().expectStatus().isForbidden
        val (op, opAuth) = login("powerhch@gmail.com")
        client().put().uri("/api/community/operator/feedback/${row.id}").header("X-Device-Id", op).header("Authorization", opAuth).bodyValue(FeedbackUpdate("REVIEWING", "확인하고 있습니다.")).exchange().expectStatus().isOk
        client().get().uri("/api/community/feedback").header("X-Device-Id", device).header("Authorization", auth).exchange().expectStatus().isOk.expectBody().jsonPath("$[0].reply").isEqualTo("확인하고 있습니다.")
        client().post().uri("/api/community/feedback").header("X-Device-Id", device).header("Authorization", auth).bodyValue(input.copy(requestId = UUID.randomUUID().toString(), content = "short", screen = "/?token=secret")).exchange().expectStatus().isBadRequest
        val user = sessions.authenticate(device, auth)
        jdbc.update("DELETE FROM app_users WHERE id=?", user)
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM user_feedback WHERE id=?", Int::class.java, row.id))
    }

    @Test fun `공지 대상 게시기간 초안 필터와 계정 공유 오늘 숨김이 적용된다`() {
        jdbc.update("DELETE FROM community_notices")
        val now = Instant.now()
        val base = NoticeInput("새 기능", "포트폴리오 분석 안내", "WEB", true, now.minusSeconds(60), null, true)
        fun create(input: NoticeInput) = client().post().uri("/api/community/operator/notices").header("X-API-Key", "community-operator").bodyValue(input).exchange().expectStatus().isOk
        create(base); create(base.copy(title = "앱", target = "ANDROID")); create(base.copy(title = "초안", published = false)); create(base.copy(title = "예정", startsAt = now.plusSeconds(3600))); create(base.copy(title = "종료", startsAt = now.minusSeconds(7200), endsAt = now.minusSeconds(3600)))
        client().get().uri("/api/community/notices?platform=WEB").exchange().expectStatus().isOk.expectBody().jsonPath("$.length()").isEqualTo(1).jsonPath("$[0].title").isEqualTo("새 기능")
        client().get().uri("/api/community/notices?platform=ANDROID").exchange().expectStatus().isOk.expectBody().jsonPath("$.length()").isEqualTo(1)
        val (device, auth) = login()
        val account = sessions.authenticate(device, auth)
        val second = UUID.randomUUID().toString()
        links.save(DeviceLink(second, account))
        val secondAuth = "Bearer ${sessions.issue(second).token}"
        client().post().uri("/api/community/hide-today").header("X-Device-Id", device).header("Authorization", auth).exchange().expectStatus().isOk
        val until = jdbc.queryForObject("SELECT hidden_until FROM notice_preferences WHERE user_id=?", java.sql.Timestamp::class.java, account)!!.toInstant()
        assertEquals(now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate().plusDays(1).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant(), until)
        client().get().uri("/api/community/popup?platform=WEB").header("X-Device-Id", second).header("Authorization", secondAuth).exchange().expectStatus().isOk.expectBody().json("[]")
        client().get().uri("/api/community/notices?platform=WEB").exchange().expectStatus().isOk.expectBody().jsonPath("$.length()").isEqualTo(1)
        jdbc.update("UPDATE notice_preferences SET hidden_until=? WHERE user_id=?", java.sql.Timestamp.from(now.minusSeconds(1)), account)
        client().get().uri("/api/community/popup?platform=WEB").header("X-Device-Id", second).header("Authorization", secondAuth).exchange().expectStatus().isOk.expectBody().jsonPath("$.length()").isEqualTo(1)
        client().get().uri("/api/community/popup?platform=WEB").header("X-Device-Id", second).exchange().expectStatus().isUnauthorized
    }

    @Test fun `피드백 푸시는 재시작 후에도 최대 세번과 한시간 간격을 지킨다`() {
        jdbc.update("DELETE FROM user_feedback")
        jdbc.update("DELETE FROM collection_operator")
        val (device, auth) = login()
        val account = sessions.authenticate(device, auth)
        val recipient = settings.save(com.firewatch.backend.entity.UserSettings(userId = account, fcmTokensRaw = "fixture-token"))
        jdbc.update("INSERT INTO collection_operator (id,settings_id) VALUES (1,?)", recipient.id)
        val now = Instant.now()
        val ticket = "outbox-${UUID.randomUUID()}"
        jdbc.update("INSERT INTO user_feedback (id,user_id,category,content,platform,version,screen,status,reply,created_at,updated_at,push_attempts) VALUES (?,?,'BUG','private content','WEB','','','NEW','',?,?,0)", ticket, account, java.sql.Timestamp.from(now), java.sql.Timestamp.from(now))
        val push = io.mockk.mockk<com.firewatch.backend.service.PushService>()
        io.mockk.every { push.notifyFeedback(any()) } returns com.firewatch.backend.service.PushSendResult(1,1,0)
        fun worker() = com.firewatch.backend.service.OperationsPushService(jdbc, settings, push)
        worker().flush(now)
        worker().flush(now.plusSeconds(30))
        assertEquals(1, jdbc.queryForObject("SELECT push_attempts FROM user_feedback WHERE id=?", Int::class.java, ticket))
        worker().flush(now.plusSeconds(3600))
        worker().flush(now.plusSeconds(7200))
        worker().flush(now.plusSeconds(10800))
        assertEquals(3, jdbc.queryForObject("SELECT push_attempts FROM user_feedback WHERE id=?", Int::class.java, ticket))
        io.mockk.verify(exactly = 3) { push.notifyFeedback(any()) }
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE action_name='feedback.operatorPush' AND status='FAILURE'", Int::class.java))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE action_name='feedback.operatorPush' AND response_summary LIKE '%private content%'", Int::class.java))
        jdbc.update("DELETE FROM collection_operator")
    }
}
