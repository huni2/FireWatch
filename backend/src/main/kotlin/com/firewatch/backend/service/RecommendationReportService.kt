package com.firewatch.backend.service

import com.firewatch.backend.entity.StockRecommendationDetail
import com.firewatch.backend.entity.recommendationDetails
import com.firewatch.backend.entity.recommendedStocks
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.dto.NewsArticleResponse
import com.firewatch.backend.web.dto.toResponse
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.sql.Timestamp

data class RecommendationReport(
    val briefingDate: LocalDate,
    val sourceBriefingDate: LocalDate?,
    val analyzedAt: Instant?,
    val recommendedStocks: List<String>,
    val recommendationDetails: List<StockRecommendationDetail>,
    val news: List<NewsArticleResponse>,
    val status: String,
    val marketSummary: String = "",
    val excludedCount: Int = 0,
)

/** New analyses are immutable. Never backfill reasons into an old briefing. */
@Service
class RecommendationReportService(
    private val jdbc: JdbcTemplate,
    private val briefings: BriefingRepository,
    private val articles: NewsArticleRepository,
) {
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    private val zone = ZoneId.of("Asia/Seoul")

    fun collectIfDue(now: Instant = Instant.now()): CollectionOutcome {
        val today = now.atZone(zone).toLocalDate()
        if (jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_reports WHERE analysis_date=?", Long::class.java, today) != 0L) {
            completeLegacyJob(today, now)
            return CollectionOutcome.SKIPPED
        }
        val source = briefings.findByBriefingDate(today) ?: return CollectionOutcome.SKIPPED
        if (source.dataSourceStatus == com.firewatch.backend.entity.DataSourceStatus.FALLBACK) return CollectionOutcome.SKIPPED
        // 분석을 다시 요청하지 않고, 이 브리핑 생성에 실제 사용한 기사와 근거를 재사용한다.
        val news = articles.findByBriefingId(source.id!!).map { it.toResponse() }
        val report = visibleReport(RecommendationReport(today, source.briefingDate, source.aiAnalyzedAt, source.recommendedStocks(),
            source.recommendationDetails(), news, "READY", source.marketSummary))
        val completed = if (report.recommendationDetails.isEmpty()) report.copy(status = "READY",
            marketSummary = "오늘 제공된 자료에서 기사 근거 조건을 충족하는 추천이 없습니다.") else report
        return try {
            val written = jdbc.update("""INSERT INTO recommendation_reports (analysis_date, source_briefing_date, analyzed_at, report_json)
                SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM recommendation_reports WHERE analysis_date=?)""",
                today, source.briefingDate, source.aiAnalyzedAt?.let(Timestamp::from), mapper.writeValueAsString(completed), today)
            completeLegacyJob(today, now)
            if (written == 1) CollectionOutcome.SUCCESS else CollectionOutcome.SKIPPED
        } catch (_: org.springframework.dao.DuplicateKeyException) { CollectionOutcome.SKIPPED }
    }

    private fun completeLegacyJob(today: LocalDate, now: Instant) {
        // 제공처 호출이 없는 작업의 완료만 정리하며, HTTP 예산·실패 회로는 초기화하지 않는다.
        jdbc.update("""UPDATE collection_jobs SET status='SUCCESS', error_code=NULL, next_attempt_at=NULL, last_success_at=?
            WHERE id=? AND lease_token IS NULL AND status IN ('FAILED','PARTIAL','PAUSED')""",
            Timestamp.from(now), "briefing:recommendations:$today")
        val pending = jdbc.queryForObject("""SELECT COUNT(*) FROM collection_jobs WHERE id LIKE 'briefing:%'
            AND last_attempt_at>=? AND status IN ('FAILED','PARTIAL','PAUSED')""", Int::class.java,
            Timestamp.from(today.atStartOfDay(zone).toInstant())) ?: 0
        if (pending == 0) jdbc.update("UPDATE collection_alerts SET resolved_at=? WHERE category='briefing' AND resolved_at IS NULL", Timestamp.from(now))
    }

    fun latest(now: Instant = Instant.now()): RecommendationReport {
        val today = now.atZone(zone).toLocalDate()
        val json = jdbc.query("SELECT report_json FROM recommendation_reports WHERE analysis_date<=? ORDER BY analysis_date DESC LIMIT 1",
            { row, _ -> row.getString(1) }, today).firstOrNull()
        return json?.let { visibleReport(mapper.readValue(it, RecommendationReport::class.java)) }
            ?: RecommendationReport(today, null, null, emptyList(), emptyList(), emptyList(), "WAITING")
    }

    fun history(from: LocalDate, to: LocalDate): List<RecommendationReport> {
        if (from > to || java.time.temporal.ChronoUnit.DAYS.between(from, to) > 366)
            throw com.firewatch.backend.web.ValidationException("분석 이력은 1년 이내 날짜 범위로 조회해주세요.", emptyMap())
        return jdbc.query("SELECT report_json FROM recommendation_reports WHERE analysis_date BETWEEN ? AND ? ORDER BY analysis_date DESC",
            { row, _ -> visibleReport(mapper.readValue(row.getString(1), RecommendationReport::class.java)) }, from, to)
    }

    private fun mentionsCompany(article: NewsArticleResponse, name: String): Boolean {
        fun normalize(text: String) = text.lowercase().replace(Regex("\\s+"), "")
        return name.isNotBlank() && normalize("${article.title} ${article.description.orEmpty()}").contains(normalize(name))
    }

    /** Preserve the original JSON; apply current evidence checks when displaying existing reports. */
    private fun visibleReport(report: RecommendationReport): RecommendationReport {
        val qualified = report.recommendationDetails.filter { detail ->
            detail.stockName in report.recommendedStocks && detail.reason.isNotBlank() && detail.risk.isNotBlank() &&
                detail.sourceNewsLinks.any { link -> (link.startsWith("https://") || link.startsWith("http://")) && report.news.any { article -> article.link == link && mentionsCompany(article, detail.stockName) } }
        }
        return report.copy(recommendedStocks = qualified.map { it.stockName }, recommendationDetails = qualified,
            status = if (qualified.isEmpty() && report.recommendedStocks.isNotEmpty()) "WAITING" else "READY", excludedCount = report.excludedCount + report.recommendationDetails.size - qualified.size,
            marketSummary = if (qualified.size < report.recommendationDetails.size) "" else report.marketSummary)
    }
}
