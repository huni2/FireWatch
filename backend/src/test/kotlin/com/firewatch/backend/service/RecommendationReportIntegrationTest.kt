package com.firewatch.backend.service

import com.firewatch.backend.client.GeminiBriefingResult
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.StockRecommendationDetail
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.web.dto.NewsArticleResponse
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Instant
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertNull

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:recommendation-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-"])
class RecommendationReportIntegrationTest {
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var briefings: BriefingRepository
    @Autowired lateinit var jobs: CollectionJobRunner

    @Test
    fun `새 근거는 분석 시각과 기사와 함께 저장하고 과거 브리핑을 변경하지 않는다`() {
        val now = Instant.parse("2026-10-08T00:00:00Z")
        val date = LocalDate.of(2026, 10, 8)
        val old = briefings.save(Briefing(briefingDate = date, marketSummary = "기존 분석", recommendedStocksRaw = "기존 기업", dataSourceStatus = DataSourceStatus.NORMAL))
        val service = service("https://example.com/news")
        assertEquals(CollectionOutcome.SUCCESS, service.collectIfDue(now))
        assertEquals(CollectionOutcome.SKIPPED, service.collectIfDue(now.plusSeconds(60)))
        val report = service.latest(now)
        assertEquals(listOf("삼성전자"), report.recommendedStocks)
        assertEquals(now, report.analyzedAt)
        assertEquals("https://example.com/news", report.news.single().link)
        assertNull(briefings.findById(old.id!!).get().recommendationDetailsRaw)
        assertEquals("기존 기업", briefings.findById(old.id!!).get().recommendedStocksRaw)
        assertEquals(1, service.history(date, date).size)
        assertEquals("WAITING", service.latest(now.minusSeconds(24 * 3600)).status)
    }

    @Test
    fun `제공하지 않은 기사에 근거한 후보는 저장하지 않고 이전 성공 분석을 유지한다`() {
        val now = Instant.parse("2026-10-10T00:00:00Z")
        briefings.save(Briefing(briefingDate = LocalDate.of(2026, 10, 10), marketSummary = "현재 분석", dataSourceStatus = DataSourceStatus.NORMAL))
        val service = service("https://example.com/unprovided")
        val count = jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_reports", Long::class.java)
        assertEquals(CollectionOutcome.FAILED, service.collectIfDue(now))
        assertEquals(count, jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_reports", Long::class.java))
        assertEquals(CollectionOutcome.SKIPPED, service.collectIfDue(now.plusSeconds(1)))
        assertEquals(1, jdbc.queryForObject("SELECT failure_count FROM collection_jobs WHERE id='briefing:recommendations:2026-10-10'", Int::class.java))
    }

    private fun service(link: String): RecommendationReportService {
        val archive = mockk<NewsArchiveService>()
        every { archive.search(any(), any(), any(), any(), any()) } returns NewsArchiveResponse(
            listOf(NewsArticleResponse("삼성전자 관련 실제 보관 기사", "https://example.com/news", "보관 내용", null)), null, 0, 5, 1, false)
        val gemini = mockk<GeminiBriefingService>()
        every { gemini.fetchTodaysBriefing(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns
            GeminiBriefingResult("새 분석", listOf("삼성전자"), recommendationDetails = listOf(StockRecommendationDetail("삼성전자", "기사에 따른 관찰 이유", "확인할 위험", listOf(link))))
        return RecommendationReportService(jdbc, briefings, archive, gemini, jobs)
    }

    @Test
    fun `동일 기사 링크여도 다른 기업의 뉴스는 제외하고 원본 분석을 보존한다`() {
        val date = LocalDate.of(2026, 10, 11)
        val report = RecommendationReport(date, date, Instant.parse("2026-10-11T00:00:00Z"), listOf("미래에셋증권"),
            listOf(StockRecommendationDetail("미래에셋증권", "계열사 혼동", "위험", listOf("https://example.com/affiliate"))),
            listOf(NewsArticleResponse("TIGER ETF 순매수 증가", "https://example.com/affiliate", "미래에셋자산운용은 ETF를 운용한다", null)), "READY", "검증되지 않은 해석")
        val json = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build().writeValueAsString(report)
        jdbc.update("INSERT INTO recommendation_reports (analysis_date, source_briefing_date, analyzed_at, report_json) VALUES (?, ?, ?, ?)", date, date, java.sql.Timestamp.from(report.analyzedAt), json)
        val result = service("https://example.com/affiliate").latest(Instant.parse("2026-10-11T01:00:00Z"))
        assertEquals(0, result.recommendationDetails.size)
        assertEquals(1, result.excludedCount)
        assertEquals("WAITING", result.status)
        assertEquals("", result.marketSummary)
        assertEquals(json, jdbc.queryForObject("SELECT report_json FROM recommendation_reports WHERE analysis_date=?", String::class.java, date))
    }
}
