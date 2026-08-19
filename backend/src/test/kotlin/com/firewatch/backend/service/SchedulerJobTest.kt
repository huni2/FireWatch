package com.firewatch.backend.service

import com.firewatch.backend.client.GeminiBriefingResult
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.repository.BriefingRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 스케줄러 오케스트레이션(순수 단위테스트, Spring 컨텍스트 없음)
class SchedulerJobTest {

    private val geminiBriefingService = mockk<GeminiBriefingService>()
    private val financialDataService = mockk<FinancialDataService>()
    private val pushService = mockk<PushService>(relaxed = true)
    private val briefingRepository = mockk<BriefingRepository>(relaxed = true)
    private val schedulerJob =
        SchedulerJob(geminiBriefingService, financialDataService, pushService, briefingRepository)

    private val sampleSnapshot = FinancialSnapshot(
        goldPrice = BigDecimal("4406.1"),
        silverPrice = BigDecimal("52.3"),
        usdKrw = BigDecimal("1384.2"),
        jpy100Krw = BigDecimal("920.1"),
        cnyKrw = BigDecimal("190.5"),
    )

    @Test
    fun `오늘자 브리핑이 이미 있으면 아무것도 호출하지 않고 스킵한다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns mockk()

        schedulerJob.runMorningBriefing()

        verify(exactly = 0) { geminiBriefingService.fetchTodaysBriefing() }
        verify(exactly = 0) { financialDataService.fetchLatestSnapshot() }
        verify(exactly = 0) { briefingRepository.save(any()) }
    }

    @Test
    fun `둘 다 성공하면 NORMAL로 저장하고 푸시를 보낸다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns null
        every { geminiBriefingService.fetchTodaysBriefing() } returns
            GeminiBriefingResult(marketSummary = "요약", recommendedStocks = listOf("삼성전자"))
        every { financialDataService.fetchLatestSnapshot() } returns sampleSnapshot
        val saved = slot<Briefing>()
        every { briefingRepository.save(capture(saved)) } answers { saved.captured }

        schedulerJob.runMorningBriefing()

        assertEquals(DataSourceStatus.NORMAL, saved.captured.dataSourceStatus)
        assertEquals(BigDecimal("4406.1"), saved.captured.goldPrice)
        verify { pushService.sendBriefingNotification(saved.captured) }
    }

    @Test
    fun `Gemini만 실패하면 FALLBACK으로 저장하고 금융 데이터는 채운다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns null
        every { geminiBriefingService.fetchTodaysBriefing() } throws IllegalStateException("gemini down")
        every { financialDataService.fetchLatestSnapshot() } returns sampleSnapshot
        val saved = slot<Briefing>()
        every { briefingRepository.save(capture(saved)) } answers { saved.captured }

        schedulerJob.runMorningBriefing()

        assertEquals(DataSourceStatus.FALLBACK, saved.captured.dataSourceStatus)
        assertEquals(BigDecimal("1384.2"), saved.captured.usdKrw)
        assertNull(saved.captured.recommendedStocksRaw)
    }

    @Test
    fun `금융 API만 실패하면 NORMAL로 저장하되 금융 필드는 비어있다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns null
        every { geminiBriefingService.fetchTodaysBriefing() } returns
            GeminiBriefingResult(marketSummary = "요약", recommendedStocks = emptyList())
        every { financialDataService.fetchLatestSnapshot() } throws IllegalStateException("yahoo down")
        val saved = slot<Briefing>()
        every { briefingRepository.save(capture(saved)) } answers { saved.captured }

        schedulerJob.runMorningBriefing()

        assertEquals(DataSourceStatus.NORMAL, saved.captured.dataSourceStatus)
        assertNull(saved.captured.goldPrice)
        assertEquals("요약", saved.captured.marketSummary)
    }

    @Test
    fun `둘 다 실패하면 예외를 던지고 아무것도 저장하지 않는다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns null
        every { geminiBriefingService.fetchTodaysBriefing() } throws IllegalStateException("gemini down")
        every { financialDataService.fetchLatestSnapshot() } throws IllegalStateException("yahoo down")

        assertFailsWith<IllegalStateException> { schedulerJob.runMorningBriefing() }

        verify(exactly = 0) { briefingRepository.save(any()) }
    }
}
