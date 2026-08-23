package com.firewatch.backend.service

import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.interestKeywords
import com.firewatch.backend.entity.watchedStocks
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.UnauthorizedException
import com.firewatch.backend.web.ValidationException
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

// Design Ref: docs/02-design/features/firewatch.design.md §8.3, ADR 0004(정적 API 키) — 순수 단위테스트
class SettingsServiceTest {

    private val userSettingsRepository = mockk<UserSettingsRepository>(relaxed = true)
    private val settingsService = SettingsService(userSettingsRepository, expectedApiKey = "secret-key")

    @Test
    fun `API 키가 맞으면 설정을 갱신한다`() {
        val existing = UserSettings(id = SINGLETON_SETTINGS_ID, pushTime = "08:00")
        every { userSettingsRepository.findById(SINGLETON_SETTINGS_ID) } returns Optional.of(existing)
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                pushTime = "07:30",
                interestKeywords = listOf("반도체", "AI"),
                watchedStocks = listOf("005930.KS", "AAPL"),
                apiKey = "secret-key",
                clientIp = "127.0.0.1",
            ),
        )

        assertEquals("07:30", result.pushTime)
        assertEquals(listOf("반도체", "AI"), result.interestKeywords())
        assertEquals(listOf("005930.KS", "AAPL"), result.watchedStocks())
    }

    @Test
    fun `API 키가 틀리면 UnauthorizedException을 던지고 저장하지 않는다`() {
        assertFailsWith<UnauthorizedException> {
            settingsService.update(
                SettingsUpdateCommand(
                    pushTime = "07:30",
                    interestKeywords = emptyList(),
                    apiKey = "wrong-key",
                    clientIp = null,
                ),
            )
        }

        verify(exactly = 0) { userSettingsRepository.save(any()) }
    }

    @Test
    fun `티커 형식이 아닌 관심 종목이 있으면 ValidationException을 던지고 저장하지 않는다`() {
        // Kotlin의 List<@Pattern String> 타입-인자 애노테이션은 검증되지 않아(2026-08-21 실측) 서비스에서 직접 막는다.
        assertFailsWith<ValidationException> {
            settingsService.update(
                SettingsUpdateCommand(
                    pushTime = "07:30",
                    interestKeywords = emptyList(),
                    watchedStocks = listOf("005930.KS", "반도체"),
                    apiKey = "secret-key",
                    clientIp = null,
                ),
            )
        }

        verify(exactly = 0) { userSettingsRepository.save(any()) }
    }

    @Test
    fun `fcmToken이 있으면 기존 토큰 목록에 병합한다`() {
        val existing = UserSettings(id = SINGLETON_SETTINGS_ID, pushTime = "08:00", fcmTokensRaw = "token-a")
        every { userSettingsRepository.findById(SINGLETON_SETTINGS_ID) } returns Optional.of(existing)
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                pushTime = "08:00",
                interestKeywords = emptyList(),
                fcmToken = "token-b",
                apiKey = "secret-key",
                clientIp = null,
            ),
        )

        assertEquals(listOf("token-a", "token-b"), result.fcmTokens())
    }

    @Test
    fun `이미 등록된 fcmToken이면 중복 추가하지 않는다`() {
        val existing = UserSettings(id = SINGLETON_SETTINGS_ID, pushTime = "08:00", fcmTokensRaw = "token-a")
        every { userSettingsRepository.findById(SINGLETON_SETTINGS_ID) } returns Optional.of(existing)
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        val result = settingsService.update(
            SettingsUpdateCommand(
                pushTime = "08:00",
                interestKeywords = emptyList(),
                fcmToken = "token-a",
                apiKey = "secret-key",
                clientIp = null,
            ),
        )

        assertEquals(listOf("token-a"), result.fcmTokens())
    }

    @Test
    fun `설정이 아직 없으면 새로 만든다`() {
        every { userSettingsRepository.findById(SINGLETON_SETTINGS_ID) } returns Optional.empty()
        val saved = slot<UserSettings>()
        every { userSettingsRepository.save(capture(saved)) } answers { saved.captured }

        settingsService.update(
            SettingsUpdateCommand(
                pushTime = "09:00",
                interestKeywords = listOf("금"),
                apiKey = "secret-key",
                clientIp = null,
            ),
        )

        assertEquals(SINGLETON_SETTINGS_ID, saved.captured.id)
    }
}
