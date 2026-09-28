package com.firewatch.backend.service

import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.WebPushKeys
import com.firewatch.backend.entity.WebPushSubscription
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.interestKeywords
import com.firewatch.backend.entity.toJsonString
import com.firewatch.backend.entity.watchedStocks
import com.firewatch.backend.entity.webPushSubscriptions
import com.firewatch.backend.repository.SettingsIdentityResolver
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.ValidationException
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 순수 단위테스트.
// 공개 배포 전환(2026-09) 이후 쓰기 권한은 X-Device-Id 자체이고(ADR 0004는 폐기), 기기 식별 로직은
// SettingsIdentityResolver로 옮겼다 — 여기서는 그 결과(UserSettings)를 받아 필드를 올바르게
// 갱신하는지만 검증한다.
class SettingsServiceTest {

    private val identityResolver = mockk<SettingsIdentityResolver>()
    private val userSettingsRepository = mockk<UserSettingsRepository>(relaxed = true)
    private val settingsService = SettingsService(identityResolver, userSettingsRepository)

    @Test
    fun `기기 설정을 갱신한다`() {
        val existing = UserSettings(deviceId = "device-a", pushTime = "08:00")
        every { identityResolver.resolveForDevice("device-a") } returns existing
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                deviceId = "device-a",
                pushTime = "07:30",
                interestKeywords = listOf("반도체", "AI"),
                watchedStocks = listOf("005930.KS", "AAPL"),
                clientIp = "127.0.0.1",
            ),
        )

        assertEquals("07:30", result.pushTime)
        assertEquals(listOf("반도체", "AI"), result.interestKeywords())
        assertEquals(listOf("005930.KS", "AAPL"), result.watchedStocks())
    }

    @Test
    fun `티커 형식이 아닌 관심 종목이 있으면 ValidationException을 던지고 저장하지 않는다`() {
        // Kotlin의 List<@Pattern String> 타입-인자 애노테이션은 검증되지 않아(2026-08-21 실측) 서비스에서 직접 막는다.
        assertFailsWith<ValidationException> {
            settingsService.update(
                SettingsUpdateCommand(
                    deviceId = "device-a",
                    pushTime = "07:30",
                    interestKeywords = emptyList(),
                    watchedStocks = listOf("005930.KS", "반도체"),
                    clientIp = null,
                ),
            )
        }

        verify(exactly = 0) { userSettingsRepository.save(any()) }
    }

    @Test
    fun `fcmToken이 있으면 기존 토큰 목록에 병합한다`() {
        val existing = UserSettings(deviceId = "device-a", pushTime = "08:00", fcmTokensRaw = "token-a")
        every { identityResolver.resolveForDevice("device-a") } returns existing
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                deviceId = "device-a",
                pushTime = "08:00",
                interestKeywords = emptyList(),
                fcmToken = "token-b",
                clientIp = null,
            ),
        )

        assertEquals(listOf("token-a", "token-b"), result.fcmTokens())
    }

    @Test
    fun `이미 등록된 fcmToken이면 중복 추가하지 않는다`() {
        val existing = UserSettings(deviceId = "device-a", pushTime = "08:00", fcmTokensRaw = "token-a")
        every { identityResolver.resolveForDevice("device-a") } returns existing
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                deviceId = "device-a",
                pushTime = "08:00",
                interestKeywords = emptyList(),
                fcmToken = "token-a",
                clientIp = null,
            ),
        )

        assertEquals(listOf("token-a"), result.fcmTokens())
    }

    @Test
    fun `webPushSubscription이 있으면 기존 구독 목록에 병합한다`() {
        val existingSub = WebPushSubscription("https://push.example/a", WebPushKeys("p256dh-a", "auth-a"))
        val newSub = WebPushSubscription("https://push.example/b", WebPushKeys("p256dh-b", "auth-b"))
        val existing = UserSettings(
            deviceId = "device-a",
            pushTime = "08:00",
            webPushSubscriptionsRaw = listOf(existingSub).toJsonString(),
        )
        every { identityResolver.resolveForDevice("device-a") } returns existing
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                deviceId = "device-a",
                pushTime = "08:00",
                interestKeywords = emptyList(),
                webPushSubscription = newSub,
                clientIp = null,
            ),
        )

        assertEquals(listOf(existingSub, newSub), result.webPushSubscriptions())
    }

    @Test
    fun `이미 등록된 endpoint의 webPushSubscription이면 중복 추가하지 않는다`() {
        val existingSub = WebPushSubscription("https://push.example/a", WebPushKeys("p256dh-a", "auth-a"))
        val existing = UserSettings(
            deviceId = "device-a",
            pushTime = "08:00",
            webPushSubscriptionsRaw = listOf(existingSub).toJsonString(),
        )
        every { identityResolver.resolveForDevice("device-a") } returns existing
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        // endpoint는 같지만 keys가 다른 재구독 시도 — endpoint 기준으로만 중복 판정하므로 갱신되지 않는다(현재 정책).
        val resubscribed = existingSub.copy(keys = WebPushKeys("different", "different"))
        val result = settingsService.update(
            SettingsUpdateCommand(
                deviceId = "device-a",
                pushTime = "08:00",
                interestKeywords = emptyList(),
                webPushSubscription = resubscribed,
                clientIp = null,
            ),
        )

        assertEquals(listOf(existingSub), result.webPushSubscriptions())
    }

    @Test
    fun `새 기기면 새로 만들어진 설정을 저장한다`() {
        val fresh = UserSettings(deviceId = "device-new")
        every { identityResolver.resolveForDevice("device-new") } returns fresh
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        settingsService.update(
            SettingsUpdateCommand(
                deviceId = "device-new",
                pushTime = "09:00",
                interestKeywords = listOf("금"),
                clientIp = null,
            ),
        )

        assertEquals("device-new", saved.captured.deviceId)
    }
}
