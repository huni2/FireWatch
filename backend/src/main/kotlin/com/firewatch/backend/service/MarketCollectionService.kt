package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.*
import com.firewatch.backend.repository.*
import com.firewatch.backend.web.dto.NewsArticleResponse
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.time.*
import java.security.MessageDigest

data class NewsFeedResponse(val news: List<NewsArticleResponse>, val updatedAt: Instant?, val refreshMinutes: Int = 30) {
    override fun toString() = "추가 뉴스 ${news.size}건 (수집 $updatedAt)"
}

/** Collection stays independent of the immutable morning briefing. Runs are recorded for catch-up after sleep. */
@Service
class MarketCollectionService(
    private val portfolios: PortfolioRepository,
    private val quotes: MarketQuoteRepository,
    private val feed: NewsFeedRepository,
    private val runs: CollectionRunRepository,
    private val newsService: NewsService,
    private val stocks: StockService,
    private val jobs: CollectionJobRunner,
    private val observations: MarketObservationStore,
    private val financial: FinancialDataService,
    private val settings: UserSettingsRepository,
    private val recommendations: RecommendedStockSnapshotRepository,
    private val operationsPush: OperationsPushService,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    private val zone = ZoneId.of("Asia/Seoul")

    @Scheduled(cron = "\${firewatch.market.collection-cron:0 0,30 * * * *}", zone = "Asia/Seoul")
    @Synchronized
    fun collectIfDue() {
        try { collectData() } finally { operationsPush.flush(Instant.now()) }
    }

    internal fun collectData(now: Instant = Instant.now()) {
        val local = now.atZone(zone)
        jobs.run("news:${local.toLocalDate()}", now, Duration.ofMinutes(30), fetch = {
            newsService.fetchRelatedNews().filter { it.link.startsWith("https://") || it.link.startsWith("http://") }
                .distinctBy { it.link }.also { check(it.isNotEmpty()) { "EMPTY_NEWS_FEED" } }
        }, persist = { articles ->
                var count = 0
                articles.forEach { article ->
                    val key = MessageDigest.getInstance("SHA-256").digest(article.link.toByteArray()).joinToString("") { "%02x".format(it) }
                    if (!feed.existsById(key)) { feed.save(NewsFeedItem(key, article.title.take(500), article.link.take(1000), article.description.take(1000), article.pubDate, now)); count++ }
                }
                runs.save(CollectionRun("news", now))
                CollectionWrite(count)
        })
        // Morning pass captures the completed US session; afternoon pass captures the KR session.
        val slot = if (local.hour >= 16) "${local.toLocalDate()}-close" else if (local.hour >= 7) "${local.toLocalDate()}-morning" else return
        jobs.run("financial:$slot", now, fetch = { financial.fetchLatestSnapshot() }, persist = { snapshot ->
            val values = observations.financialValues(snapshot)
            var count = 0
            values.forEach { (asset, value) -> if (value != null && value.signum() > 0) count += observations.save(asset, value, observations.financialUnit(asset), "FINANCIAL_API", null, now, slot) }
            // KR bond is optional when ECOS is unconfigured. Core gaps remain visible.
            CollectionWrite(count, values.filterKeys { it != "KR_BOND_10Y" }.values.any { it == null || it.signum() <= 0 })
        })
        val symbols = (portfolios.findAll().flatMap { mapper.readValue(it.holdingsJson, Array<com.firewatch.backend.web.dto.PortfolioHoldingInput>::class.java).map { h -> h.symbol } } +
            settings.findAll().flatMap { it.watchedStocks() } + recommendations.findAllByOrderByBriefingDateDesc().mapNotNull { it.symbol })
            .map { it.trim().uppercase() }.filter { it.matches(Regex("[A-Z0-9^][A-Z0-9.^=-]{0,19}")) }.distinct()
        var requests = 0
        symbols.forEach { symbol ->
            if (requests >= 10) return@forEach
            jobs.run("stock:$slot:$symbol", now, fetch = {
                requests++
                stocks.fetchPriceHistory(symbol, StockRange.MONTH).points.filter { Instant.parse(it.timestamp) <= now && it.close.signum() > 0 }
                    .sortedBy { it.timestamp }.also { check(it.isNotEmpty()) { "EMPTY_STOCK_HISTORY" } }
            }, persist = { points ->
                var count = 0
                points.forEach { point -> count += observations.save("STOCK:$symbol", point.close, "NATIVE_PRICE", "STOCK_API", Instant.parse(point.timestamp), now, point.timestamp) }
                val point = points.last()
                val asOf = Instant.parse(point.timestamp)
                val old = quotes.findById(symbol).orElse(null)
                if (old == null || asOf >= old.asOf) quotes.save(MarketQuote(symbol, point.close, asOf, now))
                CollectionWrite(count)
            })
        }
    }

    fun latestNews(): NewsFeedResponse {
        val articles = feed.findTop50ByOrderByPubDateDescCollectedAtDesc().distinctBy { it.title.trim().lowercase() }
        return NewsFeedResponse(articles.map { NewsArticleResponse(it.title, it.link, it.description, it.pubDate) }, runs.findById("news").orElse(null)?.completedAt)
    }
}
