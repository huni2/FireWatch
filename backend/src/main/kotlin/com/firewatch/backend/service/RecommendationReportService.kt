package com.firewatch.backend.service

import com.firewatch.backend.client.NewsArticleResult
import com.firewatch.backend.entity.StockRecommendationDetail
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.web.dto.NewsArticleResponse
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
    private val archive: NewsArchiveService,
    private val gemini: GeminiBriefingService,
    private val jobs: CollectionJobRunner,
) {
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    private val zone = ZoneId.of("Asia/Seoul")

    fun collectIfDue(now: Instant = Instant.now()): CollectionOutcome {
        val today = now.atZone(zone).toLocalDate()
        if (jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_reports WHERE analysis_date=?", Long::class.java, today) != 0L)
            return CollectionOutcome.SKIPPED
        val source = briefings.findByBriefingDate(today) ?: return CollectionOutcome.SKIPPED
        return jobs.run("briefing:recommendations:$today", now, fetch = {
            val articles = archive.search(null, today, null, 0, 5).news
            check(articles.isNotEmpty()) { "NO_RECOMMENDATION_NEWS" }
            val generated = gemini.fetchTodaysBriefing(source.goldPrice, source.silverPrice, source.usdKrw, source.jpy100Krw,
                source.cnyKrw, source.kospi, source.kosdaq, source.sp500, source.nasdaq, source.dow, source.usBondYield10y,
                source.krBondYield10y, articles.map { NewsArticleResult(it.title, it.link, it.description.orEmpty(), it.pubDate) })
            val links = articles.map { it.link }.filter { it.startsWith("https://") || it.startsWith("http://") }.toSet()
            val details = generated.recommendationDetails.filter { detail ->
                detail.stockName in generated.recommendedStocks && detail.reason.isNotBlank() && detail.risk.isNotBlank() &&
                    detail.sourceNewsLinks.any { link -> link in links && articles.any { article -> article.link == link && mentionsCompany(article, detail.stockName) } }
            }.map { it.copy(sourceNewsLinks = it.sourceNewsLinks.filter { link -> link in links }) }.distinctBy { it.stockName }
            check(details.isNotEmpty()) { "NO_QUALIFIED_RECOMMENDATIONS" }
            RecommendationReport(today, source.briefingDate, now, details.map { it.stockName }, details, articles, "READY", generated.marketSummary)
        }, persist = { result ->
            jdbc.update("INSERT INTO recommendation_reports (analysis_date, source_briefing_date, analyzed_at, report_json) VALUES (?, ?, ?, ?)",
                today, source.briefingDate, Timestamp.from(now), mapper.writeValueAsString(result))
            CollectionWrite(result.recommendationDetails.size)
        })
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
                detail.sourceNewsLinks.any { link -> report.news.any { article -> article.link == link && mentionsCompany(article, detail.stockName) } }
        }
        return report.copy(recommendedStocks = qualified.map { it.stockName }, recommendationDetails = qualified,
            status = if (qualified.isEmpty()) "WAITING" else "READY", excludedCount = report.recommendationDetails.size - qualified.size,
            marketSummary = if (qualified.size < report.recommendationDetails.size) "" else report.marketSummary)
    }
}
