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
import java.time.LocalDate
import kotlin.test.assertEquals

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 스케줄러 오케스트레이션(순수 단위테스트, Spring 컨텍스트 없음)
class SchedulerJobTest {

    private val geminiBriefingService = mockk<GeminiBriefingService>()
    private val briefingRepository = mockk<BriefingRepository>(relaxed = true)
    private val schedulerJob = SchedulerJob(geminiBriefingService, briefingRepository)

    @Test
    fun `오늘자 브리핑이 이미 있으면 Gemini를 호출하지 않고 스킵한다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns mockk()

        schedulerJob.runMorningBriefing()

        verify(exactly = 0) { geminiBriefingService.fetchTodaysBriefing() }
        verify(exactly = 0) { briefingRepository.save(any()) }
    }

    @Test
    fun `오늘자 브리핑이 없으면 Gemini 결과로 저장한다`() {
        every { briefingRepository.findByBriefingDate(LocalDate.now()) } returns null
        every { geminiBriefingService.fetchTodaysBriefing() } returns
            GeminiBriefingResult(marketSummary = "요약", recommendedStocks = listOf("삼성전자", "SK하이닉스"))
        val saved = slot<Briefing>()
        every { briefingRepository.save(capture(saved)) } answers { saved.captured }

        schedulerJob.runMorningBriefing()

        assertEquals(LocalDate.now(), saved.captured.briefingDate)
        assertEquals("요약", saved.captured.marketSummary)
        assertEquals("삼성전자,SK하이닉스", saved.captured.recommendedStocksRaw)
        assertEquals(DataSourceStatus.NORMAL, saved.captured.dataSourceStatus)
    }
}
