// 실제 DB 수집 제한과 FALLBACK 복구 시 원본 자료 보존을 검증한다.
package com.firewatch.backend.service

import com.firewatch.backend.client.GeminiBriefingResult
import com.firewatch.backend.client.NewsArticleResult
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.NewsArticleRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpHeaders
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneId
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:briefing-recovery-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.market.collection-cron=-"])
class SchedulerRecoveryIntegrationTest {
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var jobs: CollectionJobRunner
    @Autowired lateinit var briefings: BriefingRepository
    @Autowired lateinit var articles: NewsArticleRepository
    private val gemini = mockk<GeminiBriefingService>()
    private val financial = mockk<FinancialDataService>()
    private val news = mockk<NewsService>()
    private val snapshots = mockk<RecommendedStockSnapshotService>(relaxed = true)
    private val today get() = LocalDate.now(ZoneId.of("Asia/Seoul"))
    private val key get() = "briefing:$today"

    @BeforeEach fun prepare() {
        listOf("briefing_news", "briefings", "collection_jobs", "collection_circuits", "collection_alerts").forEach { jdbc.update("DELETE FROM $it") }
        every { financial.fetchLatestSnapshot() } returns FinancialSnapshot(BigDecimal("2500"), null, BigDecimal("1400"), null, null)
        every { news.fetchRelatedNews() } returns listOf(NewsArticleResult("보관 기사", "https://example.com/news", "자료", null))
    }

    private fun scheduler() = SchedulerJob(gemini, financial, news, snapshots, briefings, articles, mockk(relaxed = true), "Asia/Seoul", jobs, mockk(relaxed = true))
    private fun unavailable(status: Int = 503) = WebClientResponseException.create(status, "provider failure", HttpHeaders.EMPTY, byteArrayOf(), null)
    private fun due() {
        jdbc.update("UPDATE collection_jobs SET next_attempt_at=NULL WHERE id=?", key)
        jdbc.update("UPDATE collection_circuits SET next_attempt_at=NULL WHERE id=?", key)
    }

    @Test fun `저장된 기본 브리핑에 입력 자료가 전혀 없으면 AI를 호출하지 않는다`() {
        briefings.save(com.firewatch.backend.entity.Briefing(briefingDate = today, marketSummary = "자료 없음", dataSourceStatus = DataSourceStatus.FALLBACK))
        scheduler().runMorningBriefing()
        verify(exactly = 0) { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) }
        assertEquals(DataSourceStatus.FALLBACK, briefings.findByBriefingDate(today)?.dataSourceStatus)
    }

    @Test fun `503 후 제한된 재시도로 원본 지표 뉴스 ID 시각을 유지하며 복구한다`() {
        every { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) } throws unavailable()
        scheduler().runMorningBriefing()
        val fallback = assertNotNull(briefings.findByBriefingDate(today))
        val originalNews = articles.findByBriefingId(fallback.id!!).map { it.id }
        assertEquals(DataSourceStatus.FALLBACK, fallback.dataSourceStatus)
        assertEquals("PARTIAL", jdbc.queryForObject("SELECT status FROM collection_jobs WHERE id=?", String::class.java, key))
        assertEquals("INCOMPLETE_DATA:GEMINI_HTTP_503", jdbc.queryForObject("SELECT error_code FROM collection_jobs WHERE id=?", String::class.java, key))
        scheduler().runMorningBriefing()
        verify(exactly = 1) { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) }

        // 구버전이 FALLBACK을 SUCCESS로 기록한 경우도 복구한다.
        jdbc.update("UPDATE collection_jobs SET status='SUCCESS' WHERE id=?", key)
        due()
        every { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns GeminiBriefingResult("복구된 요약", emptyList())
        scheduler().runMorningBriefing()
        val recovered = assertNotNull(briefings.findByBriefingDate(today))
        assertEquals(DataSourceStatus.NORMAL, recovered.dataSourceStatus)
        assertNotNull(recovered.aiAnalyzedAt)
        assertEquals("복구된 요약", recovered.marketSummary)
        assertEquals(fallback.id, recovered.id)
        assertEquals(fallback.createdAt, recovered.createdAt)
        assertEquals(fallback.goldPrice, recovered.goldPrice)
        assertEquals(originalNews, articles.findByBriefingId(recovered.id!!).map { it.id })
        assertEquals(1L, briefings.count())
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_alerts WHERE resolved_at IS NULL", Int::class.java))
        scheduler().runMorningBriefing()
        verify(exactly = 2) { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) }
        verify(exactly = 1) { financial.fetchLatestSnapshot() }
        verify(exactly = 1) { news.fetchRelatedNews() }
    }

    @Test fun `503 반복 실패는 세 번 후 중지하며 기존 FALLBACK을 보존한다`() {
        every { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) } throws unavailable()
        scheduler().runMorningBriefing()
        val original = assertNotNull(briefings.findByBriefingDate(today))
        repeat(3) { due(); scheduler().runMorningBriefing() }
        verify(exactly = 3) { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) }
        assertEquals("PAUSED", jdbc.queryForObject("SELECT status FROM collection_jobs WHERE id=?", String::class.java, key))
        val preserved = assertNotNull(briefings.findByBriefingDate(today))
        assertEquals(original.id, preserved.id)
        assertEquals(original.marketSummary, preserved.marketSummary)
        assertEquals(original.createdAt, preserved.createdAt)
        assertEquals(1L, articles.count())
    }

    @Test fun `429는 즉시 당일 중지하고 FALLBACK에서 추천용 추가 Gemini 호출을 하지 않는다`() {
        every { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) } throws unavailable(429)
        scheduler().runMorningBriefing()
        due()
        scheduler().runMorningBriefing()
        assertEquals("PAUSED", jdbc.queryForObject("SELECT status FROM collection_jobs WHERE id=?", String::class.java, key))
        val recommendations = RecommendationReportService(jdbc, briefings, articles)
        assertEquals(CollectionOutcome.SKIPPED, recommendations.collectIfDue())
        verify(exactly = 1) { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) }
        assertTrue(briefings.findByBriefingDate(today)?.dataSourceStatus == DataSourceStatus.FALLBACK)
    }
}
