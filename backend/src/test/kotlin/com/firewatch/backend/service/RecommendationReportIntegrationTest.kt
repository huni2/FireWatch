// 저장 브리핑의 근거만 재사용하고 추천 없음도 추가 AI 호출 없이 정상 보관하는지 검증한다.
package com.firewatch.backend.service

import com.firewatch.backend.entity.*
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.dto.NewsArticleResponse
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Instant
import java.time.LocalDate
import java.util.concurrent.Executors
import kotlin.test.*

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:recommendation-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-"])
class RecommendationReportIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = com.firewatch.backend.web.TestDatabase.configure(registry)
    }
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var briefings: BriefingRepository
    @Autowired lateinit var articles: NewsArticleRepository
    private val now = Instant.parse("2026-10-21T00:00:00Z")
    private val day = LocalDate.of(2026, 10, 21)
    private fun service() = RecommendationReportService(jdbc, briefings, articles)

    @BeforeEach fun clear() {
        listOf("recommendation_reports", "briefing_news", "briefings", "collection_jobs", "collection_circuits", "collection_alerts").forEach { jdbc.update("DELETE FROM $it") }
    }

    private fun source(link: String = "https://example.com/news", title: String = "삼성전자 관련 보관 기사"): Briefing {
        val source = briefings.save(Briefing(briefingDate = day, marketSummary = "저장된 분석", recommendedStocksRaw = "삼성전자",
            recommendationDetailsRaw = listOf(StockRecommendationDetail("삼성전자", "기사에 따른 관찰 이유", "확인할 위험", listOf(link))).toRecommendationJson(),
            dataSourceStatus = DataSourceStatus.NORMAL, aiAnalyzedAt = now.minusSeconds(600)))
        articles.save(NewsArticle(briefingId = source.id!!, title = title, link = "https://example.com/news", description = "보관 자료"))
        return source
    }

    @Test fun `같은 브리핑과 포함 기사와 실제 AI 생성 시각을 재사용하고 원본은 변경하지 않는다`() {
        val original = source()
        assertEquals(CollectionOutcome.SUCCESS, service().collectIfDue(now))
        assertEquals(CollectionOutcome.SKIPPED, service().collectIfDue(now.plusSeconds(60)))
        val report = service().latest(now)
        assertEquals(listOf("삼성전자"), report.recommendedStocks)
        assertEquals(original.aiAnalyzedAt, report.analyzedAt)
        assertEquals("https://example.com/news", report.news.single().link)
        assertEquals("READY", report.status)
        assertEquals(original.recommendationDetailsRaw, briefings.findById(original.id!!).get().recommendationDetailsRaw)
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_jobs", Int::class.java))
        assertEquals(1, service().history(day, day).size)
    }

    @Test fun `제공되지 않은 링크나 다른 회사의 기사는 추천 없이 정상 완료하고 실패 회로를 소모하지 않는다`() {
        source("https://example.com/unprovided")
        assertEquals(CollectionOutcome.SUCCESS, service().collectIfDue(now))
        val report = service().latest(now)
        assertEquals("READY", report.status)
        assertTrue(report.recommendationDetails.isEmpty())
        assertEquals(1, report.excludedCount)
        assertTrue(report.marketSummary.contains("추천이 없습니다"))
        assertEquals(CollectionOutcome.SKIPPED, service().collectIfDue(now.plusSeconds(1)))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_circuits", Int::class.java))
    }

    @Test fun `FALLBACK은 추천을 생성하지 않고 옛 정상 자료의 미확인 분석 시각을 만들지 않는다`() {
        val original = source()
        original.dataSourceStatus = DataSourceStatus.FALLBACK
        original.aiAnalyzedAt = null
        briefings.save(original)
        assertEquals(CollectionOutcome.SKIPPED, service().collectIfDue(now))
        original.dataSourceStatus = DataSourceStatus.NORMAL
        briefings.save(original)
        assertEquals(CollectionOutcome.SUCCESS, service().collectIfDue(now))
        assertNull(service().latest(now).analyzedAt)
    }

    @Test fun `추천이 원래 없거나 입력 뉴스가 없으면 정상적인 빈 추천으로 보관한다`() {
        briefings.save(Briefing(briefingDate = day, marketSummary = "시장 분석", dataSourceStatus = DataSourceStatus.NORMAL))
        assertEquals(CollectionOutcome.SUCCESS, service().collectIfDue(now))
        assertEquals("READY", service().latest(now).status)
        assertTrue(service().latest(now).recommendedStocks.isEmpty())
        assertEquals("WAITING", service().latest(now.minusSeconds(86400)).status)
    }

    @Test fun `동시 재사용도 같은 날짜 보고서를 한 번만 저장한다`() {
        source()
        val pool = Executors.newFixedThreadPool(2)
        try {
            val futures = (1..2).map { pool.submit<CollectionOutcome> { service().collectIfDue(now) } }
            val outcomes = futures.map { it.get() }
            assertEquals(1, outcomes.count { it == CollectionOutcome.SUCCESS })
            assertEquals(1, outcomes.count { it == CollectionOutcome.SKIPPED })
            assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_reports", Long::class.java))
        } finally { pool.shutdownNow() }
    }

    @Test fun `옛 추천 호출이 중지됐어도 저장 결과를 재사용하고 예산 초기화 없이 장애를 해소한다`() {
        source()
        jdbc.update("INSERT INTO collection_jobs (id,status,last_attempt_at) VALUES (?,'PAUSED',?)", "briefing:recommendations:$day", java.sql.Timestamp.from(now))
        jdbc.update("INSERT INTO collection_circuits (id,failure_count) VALUES (?,3)", "briefing:$day")
        jdbc.update("INSERT INTO collection_alerts (id,category,message,paused,created_at,updated_at) VALUES (?,'briefing','test',TRUE,?,?)", "briefing:$day", java.sql.Timestamp.from(now), java.sql.Timestamp.from(now))
        assertEquals(CollectionOutcome.SUCCESS, service().collectIfDue(now))
        assertEquals("SUCCESS", jdbc.queryForObject("SELECT status FROM collection_jobs WHERE id=?", String::class.java, "briefing:recommendations:$day"))
        assertEquals(3, jdbc.queryForObject("SELECT failure_count FROM collection_circuits WHERE id=?", Int::class.java, "briefing:$day"))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_alerts WHERE resolved_at IS NULL", Int::class.java))
    }

    @Test fun `기존 분석의 계열사 혼동은 표시에서 제외하고 원본 JSON은 보존한다`() {
        val report = RecommendationReport(day, day, now, listOf("미래에셋증권"),
            listOf(StockRecommendationDetail("미래에셋증권", "계열사 혼동", "위험", listOf("https://example.com/affiliate"))),
            listOf(NewsArticleResponse("TIGER ETF 순매수 증가", "https://example.com/affiliate", "미래에셋자산운용은 ETF를 운용한다", null)), "READY", "검증되지 않은 해석")
        val json = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build().writeValueAsString(report)
        jdbc.update("INSERT INTO recommendation_reports (analysis_date, source_briefing_date, analyzed_at, report_json) VALUES (?, ?, ?, ?)", day, day, java.sql.Timestamp.from(now), json)
        val result = service().latest(now)
        assertEquals(0, result.recommendationDetails.size)
        assertEquals("WAITING", result.status)
        assertEquals("", result.marketSummary)
        assertEquals(json, jdbc.queryForObject("SELECT report_json FROM recommendation_reports WHERE analysis_date=?", String::class.java, day))
    }
}
