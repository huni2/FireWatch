package com.firewatch.backend.web

import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import java.time.Instant
import kotlin.test.*
import com.firewatch.backend.client.GoogleIdentity
import com.firewatch.backend.client.GoogleIdentityVerifier
import com.firewatch.backend.web.dto.PortfolioHoldingInput
import com.firewatch.backend.web.dto.PortfolioUpdateRequest
import com.firewatch.backend.web.dto.PortfolioResponse
import com.firewatch.backend.web.dto.SettingsResponse
import org.mockito.Mockito.`when`
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.math.BigDecimal

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:session-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.settings.api-key=session-test-key", "firewatch.operator.api-key=operator-test-key"])
class AccountSessionIntegrationTest {
    @LocalServerPort var port: Int = 0
    @Autowired lateinit var sessions: AuthSessions
    @Autowired lateinit var users: AppUserRepository
    @Autowired lateinit var links: DeviceLinkRepository
    @Autowired lateinit var settings: UserSettingsRepository
    @Autowired lateinit var jdbc: org.springframework.jdbc.core.JdbcTemplate
    @MockitoBean lateinit var google: GoogleIdentityVerifier
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").responseTimeout(java.time.Duration.ofSeconds(20)).build()

    @Test
    fun `HTTP 로그아웃과 Google 재로그인은 관심 기업과 보유 종목 및 이력을 보존하고 폐기 토큰을 거절한다`() {
        val device = "record-preservation-device"
        val sub = "record-preservation-user"
        `when`(google.verify("record-preservation-fixture")).thenReturn(GoogleIdentity(sub, "preserved@example.test", true))
        fun login() = client().post().uri("/api/auth/google/link").header("X-Device-Id", device)
            .bodyValue(mapOf("idToken" to "record-preservation-fixture"))
            .exchange().expectStatus().isOk.expectBody(SettingsResponse::class.java).returnResult().responseBody!!
        val first = login()
        val firstToken = first.session!!.token
        client().put().uri("/api/settings").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .bodyValue(mapOf("watchedStocks" to listOf("035720.KS"), "interestKeywords" to listOf("반도체")))
            .exchange().expectStatus().isOk
        val savedPortfolio = client().put().uri("/api/portfolio").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .bodyValue(PortfolioUpdateRequest(0, "재로그인 보존", 60, "BALANCED", "GENERAL", BigDecimal.ZERO, BigDecimal("10000"),
                listOf(PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("3"), BigDecimal("50000")))))
            .exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        val userId = users.findByGoogleSub(sub)!!.id!!
        val ownerId = settings.findByUserId(userId)!!.id
        val portfolioBefore = jdbc.queryForList("SELECT * FROM portfolios WHERE owner_id=?", ownerId)
        val revisionsBefore = jdbc.queryForList("SELECT * FROM portfolio_revisions WHERE owner_id=? ORDER BY id", ownerId)
        assertEquals(1, portfolioBefore.size)
        assertTrue(revisionsBefore.isNotEmpty())

        client().post().uri("/api/auth/logout").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .exchange().expectStatus().isNoContent
        assertFailsWith<UnauthorizedException> { sessions.authenticate(device, "Bearer $firstToken") }
        assertFalse(links.existsById(device))
        client().get().uri("/api/settings").header("X-Device-Id", device)
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.linkedEmail").isEmpty.jsonPath("$.watchedStocks.length()").isEqualTo(0)
        assertEquals("035720.KS", settings.findById(ownerId).get().watchedStocksRaw)
        assertEquals(portfolioBefore, jdbc.queryForList("SELECT * FROM portfolios WHERE owner_id=?", ownerId))
        assertEquals(revisionsBefore, jdbc.queryForList("SELECT * FROM portfolio_revisions WHERE owner_id=? ORDER BY id", ownerId))

        val second = login()
        val secondToken = second.session!!.token
        assertNotEquals(firstToken, secondToken)
        assertEquals(listOf("035720.KS"), second.watchedStocks)
        assertEquals(listOf("반도체"), second.interestKeywords)
        assertEquals(ownerId, settings.findByUserId(userId)!!.id)
        client().get().uri("/api/portfolio").header("X-Device-Id", device).header("Authorization", "Bearer $secondToken")
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.version").isEqualTo(savedPortfolio.version)
            .jsonPath("$.goal").isEqualTo("재로그인 보존").jsonPath("$.cash").isEqualTo(10000)
            .jsonPath("$.holdings[0].holding.symbol").isEqualTo("035720.KS")
            .jsonPath("$.holdings[0].holding.quantity").isEqualTo(3)
        client().get().uri("/api/portfolio").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .exchange().expectStatus().isUnauthorized
        assertEquals(portfolioBefore, jdbc.queryForList("SELECT * FROM portfolios WHERE owner_id=?", ownerId))
        assertEquals(revisionsBefore, jdbc.queryForList("SELECT * FROM portfolio_revisions WHERE owner_id=? ORDER BY id", ownerId))
    }

    @Test
    fun `인증된 계정 삭제는 공유 보유와 문의 및 모든 세션을 지우고 다른 계정은 보존한다`() {
        val account = users.save(AppUser(googleSub = "deletion-owner", email = "delete@example.test"))
        val other = users.save(AppUser(googleSub = "deletion-other"))
        val shared = settings.save(UserSettings(userId = account.id, interestKeywordsRaw = "반도체"))
        settings.save(UserSettings(userId = other.id, interestKeywordsRaw = "보존"))
        links.save(DeviceLink("deletion-first", account.id!!))
        links.save(DeviceLink("deletion-second", account.id!!))
        links.save(DeviceLink("deletion-other-device", other.id!!))
        val first = sessions.issue("deletion-first")
        val second = sessions.issue("deletion-second")
        val otherSession = sessions.issue("deletion-other-device")
        client().put().uri("/api/portfolio").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${first.token}")
            .bodyValue(com.firewatch.backend.web.dto.PortfolioUpdateRequest(0, "삭제 검사", 60, "BALANCED", "GENERAL", java.math.BigDecimal.ZERO, java.math.BigDecimal("1000"), emptyList()))
            .exchange().expectStatus().isOk
        client().post().uri("/api/community/feedback").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${first.token}")
            .bodyValue(FeedbackInput(java.util.UUID.randomUUID().toString(), "BUG", "삭제 전 문의 기록 검사", "WEB"))
            .exchange().expectStatus().isOk
        jdbc.update("INSERT INTO notice_preferences(user_id,hidden_until) VALUES (?,?)", account.id, java.sql.Timestamp.from(Instant.now().plusSeconds(3600)))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM portfolios WHERE owner_id=?", Int::class.java, shared.id))
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_revisions WHERE owner_id=?", Int::class.java, shared.id)!! > 0)
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM user_feedback WHERE user_id=?", Int::class.java, account.id))
        client().delete().uri("/api/auth/account").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${otherSession.token}")
            .exchange().expectStatus().isUnauthorized
        assertTrue(users.existsById(account.id!!))
        client().delete().uri("/api/auth/account").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${first.token}")
            .exchange().expectStatus().isNoContent
        assertFalse(users.existsById(account.id!!))
        assertNull(settings.findByUserId(account.id!!))
        for (table in listOf("portfolios", "portfolio_revisions")) {
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM $table WHERE owner_id=?", Int::class.java, shared.id))
        }
        for (table in listOf("user_feedback", "notice_preferences", "device_links", "auth_sessions")) {
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM $table WHERE user_id=?", Int::class.java, account.id))
        }
        assertFailsWith<UnauthorizedException> { sessions.authenticate("deletion-second", "Bearer ${second.token}") }
        assertEquals(other.id, sessions.authenticate("deletion-other-device", "Bearer ${otherSession.token}"))
        assertEquals("보존", settings.findByUserId(other.id!!)?.interestKeywordsRaw)
    }

    @Test
    fun `모든 운영 API는 공개 설정 키와 일반 계정 및 위조 이메일을 거절한다`() {
        val device = "ordinary-operations"
        val user = users.save(AppUser(googleSub = device, email = "ordinary@example.com", emailVerified = true))
        links.save(DeviceLink(device, user.id!!))
        val session = sessions.issue(device)
        val routes = listOf("/api/collection/operator", "/api/collection/operator/test", "/api/scheduler/trigger", "/api/scheduler/trigger-if-due", "/api/settings/recover-legacy", "/api/operations/database-pool", "/api/operations/latency")
        for (route in routes) {
            fun request() = if (route.startsWith("/api/operations")) client().get().uri(route) else client().post().uri(route)
            request().exchange().expectStatus().isUnauthorized
            request().header("X-API-Key", "session-test-key").header("X-Device-Id", device).exchange().expectStatus().isUnauthorized
            request().header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").header("X-User-Email", "powerhch@gmail.com").exchange().expectStatus().isForbidden
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_operator", Int::class.java))
    }

    @Test
    fun `운영자 세션으로 진단과 푸시 등록이 가능하고 해제하면 즉시 거절한다`() {
        val device = "owner-operations"
        val user = users.save(AppUser(googleSub = device, email = "powerhch@gmail.com", emailVerified = true))
        val row = settings.save(UserSettings(userId = user.id, fcmTokensRaw = "fixture-operator-token"))
        links.save(DeviceLink(device, user.id!!))
        val session = sessions.issue(device)
        for (route in listOf("/api/operations/database-pool", "/api/operations/latency")) {
            client().get().uri(route).header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isOk
        }
        client().post().uri("/api/collection/operator").header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isOk
        assertEquals(row.id, jdbc.queryForObject("SELECT settings_id FROM collection_operator WHERE id=1", Long::class.java))
        sessions.logout(device, "Bearer ${session.token}")
        client().post().uri("/api/collection/operator").header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isUnauthorized
        jdbc.update("DELETE FROM collection_operator")
    }

    @Test
    fun `감사로그는 인증된 운영자나 관리 키만 읽을 수 있다`() {
        client().get().uri("/api/audit-logs").exchange().expectStatus().isUnauthorized
        client().get().uri("/api/audit-logs").header("X-API-Key", "wrong").exchange().expectStatus().isUnauthorized
        client().get().uri("/api/audit-logs").header("X-API-Key", "session-test-key").exchange().expectStatus().isUnauthorized
        client().get().uri("/api/audit-logs").header("X-API-Key", "operator-test-key").exchange().expectStatus().isOk
        data class Case(val suffix: String, val email: String, val verified: Boolean, val allowed: Boolean)
        for ((suffix, email, verified, allowed) in listOf(
            Case("owner", "powerhch@gmail.com", true, true),
            Case("user", "user@example.com", true, false),
            Case("unverified", "powerhch@gmail.com", false, false),
        )) {
            val device = "operator-$suffix"
            val user = users.save(AppUser(googleSub = device, email = email, emailVerified = verified))
            links.save(DeviceLink(device, user.id!!))
            val session = sessions.issue(device)
            client().get().uri("/api/audit-logs").header("X-Device-Id", device).exchange().expectStatus().isUnauthorized
            val response = client().get().uri("/api/audit-logs").header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").header("X-User-Email", "powerhch@gmail.com").exchange()
            if (allowed) response.expectStatus().isOk else response.expectStatus().isForbidden
            client().get().uri("/api/audit-logs").header("X-Device-Id", "other-$device").header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isUnauthorized
        }
    }

    @Test
    fun `연동된 개인 데이터는 기기 ID만으로 읽을 수 없고 만료와 기기 바인딩을 검사한다`() {
        val user = users.save(AppUser(googleSub = "session-user-one"))
        settings.save(UserSettings(userId = user.id))
        links.save(DeviceLink("session-device-one", user.id!!))
        links.save(DeviceLink("session-device-two", user.id!!))
        val first = sessions.issue("session-device-one")
        val replacement = sessions.issue("session-device-one")
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-device-one", "Bearer ${first.token}") }
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-device-two", "Bearer ${replacement.token}") }
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-device-one", "Bearer ${replacement.token}", replacement.expiresAt) }
        assertEquals(user.id, sessions.authenticate("session-device-one", "Bearer ${replacement.token}"))
        assertNotEquals(replacement.token, jdbc.queryForObject("SELECT token_hash FROM auth_sessions WHERE device_id=?", String::class.java, "session-device-one"))
        client().get().uri("/api/settings").header("X-Device-Id", "session-device-one").exchange().expectStatus().isUnauthorized
        client().get().uri("/api/settings").header("X-Device-Id", "session-device-one").header("Authorization", "Bearer ${replacement.token}").exchange().expectStatus().isOk
        client().delete().uri("/api/auth/account").header("X-Device-Id", "session-device-one").exchange().expectStatus().isUnauthorized
    }

    @Test
    fun `다른 계정 기기는 해제할 수 없고 로그아웃과 연결 해제는 공유 데이터를 보존한다`() {
        val user = users.save(AppUser(googleSub = "session-user-revoke"))
        val saved = settings.save(UserSettings(userId = user.id, watchedStocksRaw = "AAPL"))
        links.save(DeviceLink("session-revoke-one", user.id!!))
        links.save(DeviceLink("session-revoke-two", user.id!!))
        val first = sessions.issue("session-revoke-one")
        val second = sessions.issue("session-revoke-two")
        val authorization = "Bearer ${first.token}"
        val devices = sessions.devices("session-revoke-one", authorization)
        assertEquals(2, devices.size)
        assertTrue(devices.none { it.id.contains("session-revoke") })
        assertFailsWith<NotFoundException> { sessions.revokeDevice("session-revoke-one", authorization, "foreign-device") }
        sessions.revokeDevice("session-revoke-one", authorization, devices.single { !it.current }.id)
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-revoke-two", "Bearer ${second.token}") }
        sessions.logout("session-revoke-one", authorization)
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-revoke-one", authorization) }
        assertEquals("AAPL", settings.findById(saved.id).get().watchedStocksRaw)
        assertTrue(users.existsById(user.id!!))
        client().get().uri("/api/settings").header("X-Device-Id", "session-revoke-one").exchange().expectStatus().isOk.expectBody().jsonPath("$.linkedEmail").isEmpty
    }

    @Test
    fun `응답 시간 헤더를 제공하고 운영 지표는 관리 키로 보호한다`() {
        client().get().uri("/api/portfolio").header("X-Device-Id", "latency-anonymous").exchange().expectStatus().isOk.expectHeader().valueMatches("Server-Timing", "application;dur=\\d+")
        client().get().uri("/api/operations/latency").exchange().expectStatus().isUnauthorized
        client().get().uri("/api/operations/latency").header("X-API-Key", "session-test-key").exchange().expectStatus().isUnauthorized
        client().get().uri("/api/operations/latency").header("X-API-Key", "operator-test-key").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$[?(@.operation == 'GET portfolio')]").isNotEmpty
            .jsonPath("$[?(@.operation == 'GET portfolio')].failures").isEqualTo(0)
    }
}
