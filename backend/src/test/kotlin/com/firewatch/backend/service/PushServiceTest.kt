package com.firewatch.backend.service

import com.firewatch.backend.client.FcmSendResult
import com.firewatch.backend.client.FcmSender
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.UserSettingsRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.util.Optional
import kotlin.test.assertEquals

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 발송·무효 토큰 정제 로직(순수 단위테스트)
class PushServiceTest {

    private val fcmSender = mockk<FcmSender>()
    private val userSettingsRepository = mockk<UserSettingsRepository>(relaxed = true)
    private val pushService = PushService(fcmSender, userSettingsRepository)

    private val briefing = Briefing(
        briefingDate = LocalDate.now(),
        marketSummary = "요약",
        dataSourceStatus = DataSourceStatus.NORMAL,
    )

    @Test
    fun `등록된 토큰이 없으면 발송하지 않는다`() {
        every { userSettingsRepository.findById(1L) } returns
            Optional.of(UserSettings(fcmTokensRaw = null))

        val result = pushService.sendBriefingNotification(briefing)

        verify(exactly = 0) { fcmSender.sendMulticast(any(), any(), any()) }
        assertEquals(PushSendResult(tokenCount = 0, successCount = 0), result)
    }

    @Test
    fun `무효 토큰이 없으면 설정을 다시 저장하지 않는다`() {
        every { userSettingsRepository.findById(1L) } returns
            Optional.of(UserSettings(fcmTokensRaw = "token-a,token-b"))
        every { fcmSender.sendMulticast(listOf("token-a", "token-b"), any(), any()) } returns
            FcmSendResult(successCount = 2, invalidTokens = emptyList())

        val result = pushService.sendBriefingNotification(briefing)

        verify(exactly = 0) { userSettingsRepository.save(any()) }
        assertEquals(PushSendResult(tokenCount = 2, successCount = 2), result)
    }

    @Test
    fun `무효 토큰은 설정에서 제거하고 저장한다`() {
        val settings = UserSettings(fcmTokensRaw = "token-a,token-b,token-c")
        every { userSettingsRepository.findById(1L) } returns Optional.of(settings)
        every { fcmSender.sendMulticast(listOf("token-a", "token-b", "token-c"), any(), any()) } returns
            FcmSendResult(successCount = 2, invalidTokens = listOf("token-b"))
        // 제네릭 save(S): S 브리지 메서드는 relaxed mock의 자동 답변이 캐스팅에 실패해 명시 스텁이 필요하다.
        every { userSettingsRepository.save(settings) } returns settings

        val result = pushService.sendBriefingNotification(briefing)

        verify { userSettingsRepository.save(settings) }
        assertEquals("token-a,token-c", settings.fcmTokensRaw)
        assertEquals(PushSendResult(tokenCount = 3, successCount = 2), result)
    }
}
