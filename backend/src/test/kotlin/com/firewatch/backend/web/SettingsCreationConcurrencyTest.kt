package com.firewatch.backend.web

import com.firewatch.backend.repository.SettingsIdentityResolver
import com.firewatch.backend.repository.UserSettingsRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:settings-concurrency;DB_CLOSE_DELAY=-1", "spring.datasource.hikari.maximum-pool-size=3", "firewatch.scheduler.cron=-"])
class SettingsCreationConcurrencyTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @Autowired lateinit var resolver: SettingsIdentityResolver
    @Autowired lateinit var settings: UserSettingsRepository

    @Test
    fun `동시 첫 방문은 한 설정을 만들며 이후 조회가 기존 기록을 덮어쓰지 않는다`() {
        val executor = Executors.newFixedThreadPool(8)
        try {
            repeat(5) {
                val device = "race-${UUID.randomUUID()}"
                val start = CountDownLatch(1)
                val calls = (1..8).map { executor.submit<Long> { start.await(); resolver.resolveForDevice(device).id } }
                start.countDown()
                val ids = calls.map { it.get(15, TimeUnit.SECONDS) }
                assertEquals(1, ids.distinct().size)
                val row = settings.findByDeviceId(device)!!
                row.watchedStocksRaw = "AAPL"
                row.pushTime = "09:30"
                settings.saveAndFlush(row)
                val loaded = resolver.resolveForDevice(device)
                assertEquals(row.id, loaded.id)
                assertEquals("AAPL", loaded.watchedStocksRaw)
                assertEquals("09:30", loaded.pushTime)
            }
        } finally { executor.shutdownNow() }
    }
}
