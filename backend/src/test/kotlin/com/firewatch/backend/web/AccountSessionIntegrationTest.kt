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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:session-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.settings.api-key=session-test-key"])
class AccountSessionIntegrationTest {
    @LocalServerPort var port: Int = 0
    @Autowired lateinit var sessions: AuthSessions
    @Autowired lateinit var users: AppUserRepository
    @Autowired lateinit var links: DeviceLinkRepository
    @Autowired lateinit var settings: UserSettingsRepository
    @Autowired lateinit var jdbc: org.springframework.jdbc.core.JdbcTemplate
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()

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
        client().get().uri("/api/operations/latency").header("X-API-Key", "session-test-key").exchange().expectStatus().isOk.expectBody().jsonPath("$[?(@.operation == 'GET portfolio')]").isNotEmpty
    }
}
