package com.firewatch.backend.service

import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.interestKeywords
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.UnauthorizedException
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
                apiKey = "secret-key",
                clientIp = "127.0.0.1",
            ),
        )

        assertEquals("07:30", result.pushTime)
        assertEquals(listOf("반도체", "AI"), result.interestKeywords())
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
