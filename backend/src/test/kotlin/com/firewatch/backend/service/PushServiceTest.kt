package com.firewatch.backend.service

import com.firewatch.backend.client.FcmSendResult
import com.firewatch.backend.client.FcmSender
import com.firewatch.backend.client.WebPushSendResult
import com.firewatch.backend.client.WebPushSender
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.WebPushKeys
import com.firewatch.backend.entity.WebPushSubscription
import com.firewatch.backend.entity.toJsonString
import com.firewatch.backend.entity.toWebPushSubscriptions
import com.firewatch.backend.repository.UserSettingsRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.LocalTime
import kotlin.test.assertEquals

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 발송·무효 토큰/구독 정제 로직(순수 단위테스트)
// 공개 배포 전환(2026-09) 이후 대상은 findById(1L) 하나가 아니라 findAll()로 훑은 "지금 due한 행들"이다.
class PushServiceTest {

    private val fcmSender = mockk<FcmSender>()
    private val webPushSender = mockk<WebPushSender>()
    private val userSettingsRepository = mockk<UserSettingsRepository>(relaxed = true)
    private val pushService = PushService(fcmSender, webPushSender, userSettingsRepository)

    private val briefing = Briefing(
        briefingDate = LocalDate.now(),
        marketSummary = "요약",
        dataSourceStatus = DataSourceStatus.NORMAL,
    )

    private val subscriptionA = WebPushSubscription("https://push.example/a", WebPushKeys("p256dh-a", "auth-a"))
    private val subscriptionB = WebPushSubscription("https://push.example/b", WebPushKeys("p256dh-b", "auth-b"))

    private val now = LocalTime.of(8, 0)
    private val today = LocalDate.of(2026, 1, 1)
    private val windowMinutes = 20L

    private fun dueRow(fcmTokensRaw: String? = null, webPushSubscriptionsRaw: String? = null) =
        UserSettings(pushTime = "08:00", fcmTokensRaw = fcmTokensRaw, webPushSubscriptionsRaw = webPushSubscriptionsRaw)

    @Test
    fun `due한 행이 없으면 아무것도 발송하지 않는다`() {
        every { userSettingsRepository.findAll() } returns listOf(UserSettings(pushTime = "20:00"))

        val result = pushService.notifyDueUsers(briefing, now, windowMinutes, today)

        verify(exactly = 0) { fcmSender.sendMulticast(any(), any(), any()) }
        verify(exactly = 0) { webPushSender.sendToAll(any(), any(), any()) }
        assertEquals(PushSendResult(recipientCount = 0, tokenCount = 0, successCount = 0), result)
    }

    @Test
    fun `이미 오늘 보낸 행은 다시 보내지 않는다`() {
        every { userSettingsRepository.findAll() } returns
            listOf(dueRow(fcmTokensRaw = "token-a").apply { lastNotifiedDate = today })

        val result = pushService.notifyDueUsers(briefing, now, windowMinutes, today)

        verify(exactly = 0) { fcmSender.sendMulticast(any(), any(), any()) }
        assertEquals(0, result.recipientCount)
    }

    @Test
    fun `등록된 토큰도 구독도 없는 due 행은 카운트만 되고 발송은 없다`() {
        val row = dueRow()
        every { userSettingsRepository.findAll() } returns listOf(row)

        val result = pushService.notifyDueUsers(briefing, now, windowMinutes, today)

        verify(exactly = 0) { fcmSender.sendMulticast(any(), any(), any()) }
        verify(exactly = 0) { webPushSender.sendToAll(any(), any(), any()) }
        assertEquals(PushSendResult(recipientCount = 1, tokenCount = 0, successCount = 0), result)
        assertEquals(today, row.lastNotifiedDate)
    }

    @Test
    fun `무효 토큰은 설정에서 제거하고 저장한다`() {
        val row = dueRow(fcmTokensRaw = "token-a,token-b,token-c")
        every { userSettingsRepository.findAll() } returns listOf(row)
        every { fcmSender.sendMulticast(listOf("token-a", "token-b", "token-c"), any(), any()) } returns
            FcmSendResult(successCount = 2, invalidTokens = listOf("token-b"))
        every { userSettingsRepository.saveAll(listOf(row)) } returns listOf(row)

        val result = pushService.notifyDueUsers(briefing, now, windowMinutes, today)

        verify { userSettingsRepository.saveAll(listOf(row)) }
        assertEquals("token-a,token-c", row.fcmTokensRaw)
        assertEquals(PushSendResult(recipientCount = 1, tokenCount = 3, successCount = 2), result)
    }

    @Test
    fun `웹 푸시 구독이 있으면 발송하고 결과를 합산한다`() {
        val row = dueRow(webPushSubscriptionsRaw = listOf(subscriptionA, subscriptionB).toJsonString())
        every { userSettingsRepository.findAll() } returns listOf(row)
        every { webPushSender.sendToAll(listOf(subscriptionA, subscriptionB), any(), any()) } returns
            WebPushSendResult(successCount = 2, invalidEndpoints = emptyList())
        every { userSettingsRepository.saveAll(listOf(row)) } returns listOf(row)

        val result = pushService.notifyDueUsers(briefing, now, windowMinutes, today)

        assertEquals(
            PushSendResult(recipientCount = 1, tokenCount = 0, successCount = 0, webPushSubscriberCount = 2, webPushSuccessCount = 2),
            result,
        )
    }

    @Test
    fun `무효 웹 푸시 구독은 제거하고 저장한다`() {
        val row = dueRow(webPushSubscriptionsRaw = listOf(subscriptionA, subscriptionB).toJsonString())
        every { userSettingsRepository.findAll() } returns listOf(row)
        every { webPushSender.sendToAll(listOf(subscriptionA, subscriptionB), any(), any()) } returns
            WebPushSendResult(successCount = 1, invalidEndpoints = listOf(subscriptionA.endpoint))
        every { userSettingsRepository.saveAll(listOf(row)) } returns listOf(row)

        val result = pushService.notifyDueUsers(briefing, now, windowMinutes, today)

        verify { userSettingsRepository.saveAll(listOf(row)) }
        assertEquals(listOf(subscriptionB), row.webPushSubscriptionsRaw.toWebPushSubscriptions())
        assertEquals(
            PushSendResult(recipientCount = 1, tokenCount = 0, successCount = 0, webPushSubscriberCount = 2, webPushSuccessCount = 1),
            result,
        )
    }

    // BE-14(2026-10-04) — data class 기본 toString()("PushSendResult(recipientCount=...)")이
    // 그대로 감사로그 response_summary에 노출되던 걸(2026-09-28 지적) 사람이 읽기 좋게 고침.
    @Test
    fun `toString은 사람이 읽기 좋은 문장이다`() {
        val result = PushSendResult(
            recipientCount = 3,
            tokenCount = 5,
            successCount = 5,
            webPushSubscriberCount = 2,
            webPushSuccessCount = 1,
        )

        assertEquals("대상 3명 — FCM 5/5건, 웹푸시 1/2건 성공", result.toString())
    }
}
