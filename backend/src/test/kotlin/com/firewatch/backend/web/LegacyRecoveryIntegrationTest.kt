package com.firewatch.backend.web

import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.UserSettingsRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import kotlin.test.assertEquals

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = [
    "spring.datasource.url=jdbc:h2:mem:legacy-recovery-test;DB_CLOSE_DELAY=-1",
    "firewatch.scheduler.cron=-", "firewatch.settings.api-key=recovery-test-key",
])
class LegacyRecoveryIntegrationTest {
    @Autowired lateinit var settings: UserSettingsRepository
    @LocalServerPort private var port: Int = 0

    @Test
    fun `관리 키 없이는 이전할 수 없고 현재 데이터는 덮어쓰지 않으며 이전 행은 보존한다`() {
        val client = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
        val old = settings.findByDeviceId("legacy-owner-device") ?: settings.save(UserSettings(deviceId = "legacy-owner-device"))
        old.watchedStocksRaw = "035720.KS"
        settings.save(old)
        val used = settings.save(UserSettings(deviceId = "used-device", watchedStocksRaw = "AAPL"))
        client.post().uri("/api/settings/recover-legacy").header("X-Device-Id", "new-device").exchange().expectStatus().isUnauthorized
        client.post().uri("/api/settings/recover-legacy").header("X-Device-Id", "used-device").header("X-API-Key", "recovery-test-key").exchange().expectStatus().isEqualTo(409)
        assertEquals("AAPL", settings.findById(used.id).get().watchedStocksRaw)
        val empty = settings.save(UserSettings(deviceId = "new-device"))
        val count = settings.count()
        client.post().uri("/api/settings/recover-legacy").header("X-Device-Id", "new-device").header("X-API-Key", "recovery-test-key").exchange().expectStatus().isOk
        assertEquals(old.id, settings.findByDeviceId("new-device")!!.id)
        assertEquals("035720.KS", settings.findByDeviceId("new-device")!!.watchedStocksRaw)
        assertEquals(null, settings.findById(empty.id).get().deviceId)
        assertEquals(count, settings.count())
        client.post().uri("/api/settings/recover-legacy").header("X-Device-Id", "new-device").header("X-API-Key", "recovery-test-key").exchange().expectStatus().isNotFound
    }
}
