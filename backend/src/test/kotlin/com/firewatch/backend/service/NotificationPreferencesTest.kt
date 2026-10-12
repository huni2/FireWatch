package com.firewatch.backend.service

import com.firewatch.backend.entity.*
import com.firewatch.backend.repository.*
import com.firewatch.backend.web.SchedulerController
import com.firewatch.backend.web.ValidationException
import io.mockk.*
import org.junit.jupiter.api.Test
import java.time.*
import kotlin.test.*

class NotificationPreferencesTest {
    @Test fun `해제는 다른 기기 토큰 구독 시간 관심 기록을 보존한다`() {
        val row = UserSettings(deviceId = "test", fcmTokensRaw = "this-phone,other-phone", watchedStocksRaw = "AAPL", pushTimesRaw = "08:00,18:00",
            webPushSubscriptionsRaw = listOf(WebPushSubscription("https://a", WebPushKeys("p", "a")), WebPushSubscription("https://b", WebPushKeys("p", "a"))).toJsonString())
        val identity = mockk<SettingsIdentityResolver>(); every { identity.resolveForDevice("test") } returns row
        val users = mockk<UserSettingsRepository>(); every { users.save(any<UserSettings>()) } answers { firstArg() }
        val service = SettingsService(identity, users)
        service.update(SettingsUpdateCommand(deviceId = "test", removeFcmToken = "this-phone", removeWebPushEndpoint = "https://a", clientIp = null))
        assertEquals(listOf("other-phone"), row.fcmTokens()); assertEquals(listOf("https://b"), row.webPushSubscriptions().map { it.endpoint })
        assertEquals(listOf("08:00", "18:00"), row.pushTimes()); assertEquals(listOf("AAPL"), row.watchedStocks())
        service.update(SettingsUpdateCommand(deviceId = "test", pushTimes = listOf("18:00", "08:00"), clientIp = null))
        assertEquals(listOf("08:00", "18:00"), row.pushTimes())
    }
    @Test fun `같은 시간 재발송 없이 여러 시간 발송과 늦은 폴링 묶음을 판단한다`() {
        val today = LocalDate.of(2026,10,12)
        val row = UserSettings(pushTimesRaw = "08:00,12:00,18:00", lastNotifiedDate = today, notifiedSlotsRaw = "$today|08:00")
        assertEquals(emptyList(), SchedulerController.dueSlots(row, LocalTime.of(9,0),15,today))
        assertEquals(listOf("12:00"), SchedulerController.dueSlots(row, LocalTime.of(12,15),15,today))
        assertEquals(listOf("12:00", "18:00"), SchedulerController.dueSlots(row, LocalTime.of(19,0),15,today))
        assertEquals(listOf("08:00"), SchedulerController.dueSlots(row, LocalTime.of(8,0),15,today.plusDays(1)))
        assertEquals(emptyList(), SchedulerController.dueSlots(UserSettings(pushTimesRaw="23:55"), LocalTime.of(0,5),15,today))
    }
    @Test fun `시간 개수 형식과 키워드 없는 새 소식 설정을 거부한다`() {
        val identity = mockk<SettingsIdentityResolver>(); every { identity.resolveForDevice(any()) } returns UserSettings()
        val users = mockk<UserSettingsRepository>(relaxed=true)
        val service = SettingsService(identity,users)
        listOf(emptyList(), listOf("25:00"), listOf("08:00","12:00","16:00","18:00")).forEach { times ->
            assertFailsWith<ValidationException> { service.update(SettingsUpdateCommand(deviceId="test",pushTimes=times,clientIp=null)) }
        }
        assertFailsWith<ValidationException> { service.update(SettingsUpdateCommand(deviceId="test",newsPushEnabled=true,interestKeywords=emptyList(),clientIp=null)) }
        verify(exactly=0) { users.save(any()) }
    }
    @Test fun `새 소식은 키워드 신규 기사만 묶고 한 시간 제한 및 중복을 지킨다`() {
        val now=Instant.parse("2026-10-12T03:00:00Z")
        val row=UserSettings(newsPushEnabled=true,interestKeywordsRaw="삼성",fcmTokensRaw="token",newsPushCursor=now.minusSeconds(3600))
        val users=mockk<UserSettingsRepository>(relaxed=true); every { users.findAll() } returns listOf(row)
        every { users.save(any<UserSettings>()) } answers { firstArg() }
        val news=mockk<NewsFeedRepository>()
        every { news.findTop50ByCollectedAtAfterOrderByCollectedAtAsc(any()) } returns listOf(
            NewsFeedItem(id="new",title="삼성 새 소식",pubDate=now,collectedAt=now),
            NewsFeedItem(id="other",title="다른 소식",pubDate=now,collectedAt=now),
            NewsFeedItem(id="old",title="삼성 과거 소식",pubDate=now.minusSeconds(90000),collectedAt=now))
        val push=mockk<PushService>(); every { push.notifyNews(any(),any()) } returns PushSendResult(1,1,0)
        val service=NewsPushService(news,users,push)
        service.notifyNewArticles(now); service.notifyNewArticles(now.plusSeconds(1800)); service.notifyNewArticles(now.plusSeconds(3600))
        verify(exactly=1) { push.notifyNews(row,match { it.contains("1건") && it.contains("삼성 새 소식") }) }
        assertEquals("new",row.newsPushSeenIds);assertEquals(now,row.newsPushAttemptAt)
    }
}
