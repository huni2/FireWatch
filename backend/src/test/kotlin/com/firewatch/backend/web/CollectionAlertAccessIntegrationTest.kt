package com.firewatch.backend.web

import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.repository.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import java.time.Duration
import java.util.UUID

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:collection-access-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.operator.api-key=collection-test-key"])
class CollectionAlertAccessIntegrationTest {
    @LocalServerPort var port = 0
    @Autowired lateinit var users: AppUserRepository
    @Autowired lateinit var links: DeviceLinkRepository
    @Autowired lateinit var sessions: AuthSessions

    @Test fun `수집 장애 상세는 익명 일반 계정 위조 운영자를 차단하고 운영자만 조회한다`() {
        val client = WebTestClient.bindToServer().baseUrl("http://localhost:$port").responseTimeout(Duration.ofSeconds(20)).build()
        val path = "/api/collection/alerts"
        client.get().uri(path).exchange().expectStatus().isUnauthorized
        fun account(email: String, verified: Boolean): Pair<String, String> {
            val device = UUID.randomUUID().toString()
            val user = users.save(AppUser(googleSub = device, email = email, emailVerified = verified))
            links.save(DeviceLink(device, user.id!!))
            return device to "Bearer ${sessions.issue(device).token}"
        }
        val (device, auth) = account("ordinary@example.com", true)
        client.get().uri(path).header("X-Device-Id", device).header("Authorization", auth).exchange().expectStatus().isForbidden
        val (unverified, unverifiedAuth) = account("powerhch@gmail.com", false)
        client.get().uri(path).header("X-Device-Id", unverified).header("Authorization", unverifiedAuth).exchange().expectStatus().isForbidden
        val (operator, operatorAuth) = account("powerhch@gmail.com", true)
        client.get().uri(path).header("X-Device-Id", operator).header("Authorization", operatorAuth).exchange().expectStatus().isOk
        client.get().uri(path).header("X-Device-Id", device).header("Authorization", operatorAuth).exchange().expectStatus().isUnauthorized
        client.get().uri(path).header("X-API-Key", "collection-test-key").exchange().expectStatus().isOk
    }
}
