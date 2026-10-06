package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.entity.*
import com.firewatch.backend.repository.*
import com.firewatch.backend.web.ConflictException
import com.firewatch.backend.web.ValidationException
import com.firewatch.backend.web.dto.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant

@Service
class PortfolioService(
    private val identityResolver: SettingsIdentityResolver,
    private val portfolios: PortfolioRepository,
    private val revisions: PortfolioRevisionRepository,
    private val quotes: MarketQuoteRepository,
    private val briefings: BriefingRepository,
    private val news: NewsArticleRepository,
    private val newsFeed: NewsFeedRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.PORTFOLIO
    private val mapper = JsonMapper.builder().findAndAddModules().build()

    private fun readHoldings(portfolio: Portfolio): List<PortfolioHoldingInput> =
        mapper.readValue(portfolio.holdingsJson, Array<PortfolioHoldingInput>::class.java).toList()

    fun get(deviceId: String): PortfolioResponse {
        val owner = identityResolver.resolveForDevice(deviceId).id
        return analyze(portfolios.findById(owner).orElse(null) ?: Portfolio(ownerId = owner))
    }

    @Transactional
    fun update(deviceId: String, input: PortfolioUpdateRequest): PortfolioResponse {
        validate(input)
        val owner = identityResolver.resolveForDevice(deviceId).id
        val row = portfolios.findById(owner).orElse(null) ?: Portfolio(ownerId = owner)
        if (row.version != input.version) throw ConflictException("다른 화면에서 변경되었습니다. 새로고침 후 다시 저장해주세요.")
        row.goal = input.goal.trim()
        row.horizonMonths = input.horizonMonths
        row.riskLevel = input.riskLevel
        row.accountType = input.accountType
        row.monthlyContribution = input.monthlyContribution
        row.cash = input.cash
        row.holdingsJson = mapper.writeValueAsString(input.holdings.map { it.copy(symbol = it.symbol.trim().uppercase(), name = it.name.trim(), underlyingIndex = it.underlyingIndex.trim().uppercase()) })
        row.updatedAt = Instant.now()
        val saved = portfolios.saveAndFlush(row)
        revisions.save(PortfolioRevision(ownerId = owner, revision = saved.version, snapshotJson = mapper.writeValueAsString(input)))
        return analyze(saved)
    }

    private fun validate(input: PortfolioUpdateRequest) {
        val errors = mutableMapOf<String, String>()
        if (input.version < 0 || input.goal.isBlank() || input.goal.length > 120) errors["goal"] = "투자 목표는 1~120자입니다."
        if (input.horizonMonths !in 1..600) errors["horizonMonths"] = "투자 기간은 1~600개월입니다."
        if (input.riskLevel !in setOf("CAUTIOUS", "BALANCED", "GROWTH")) errors["riskLevel"] = "투자 성향을 선택해주세요."
        if (input.accountType !in setOf("GENERAL", "ISA", "PENSION")) errors["accountType"] = "계좌 종류를 선택해주세요."
        if (input.cash < BigDecimal.ZERO || input.monthlyContribution < BigDecimal.ZERO || input.cash > BigDecimal("1000000000000") || input.monthlyContribution > BigDecimal("1000000000")) errors["cash"] = "금액 범위를 확인해주세요."
        if (input.holdings.size > 50) errors["holdings"] = "보유 자산은 최대 50개입니다."
        if (input.holdings.map { it.symbol.uppercase() }.distinct().size != input.holdings.size) errors["holdings"] = "같은 티커는 합산해서 입력해주세요."
        input.holdings.forEachIndexed { index, h ->
            val kr = h.symbol.uppercase().endsWith(".KS") || h.symbol.uppercase().endsWith(".KQ")
            if (kr && h.currency != "KRW" || !kr && h.currency != "USD") errors["holdings.$index.currency"] = "국내 티커(.KS/.KQ)는 KRW, 미국 티커는 USD로 입력해주세요."
            if (!Regex("^[A-Za-z0-9]+(\\.[A-Za-z0-9]+)?$").matches(h.symbol) || h.symbol.length > 20 || h.name.isBlank() || h.name.length > 80 || h.quantity <= BigDecimal.ZERO || h.quantity > BigDecimal("1000000000") || h.averageCost <= BigDecimal.ZERO || h.averageCost > BigDecimal("1000000000") || h.currency !in setOf("KRW", "USD") || h.assetClass !in setOf("STOCK", "ETF", "BOND", "OTHER") || h.region !in setOf("KR", "US", "GLOBAL") || h.sector.length > 40 || h.underlyingIndex.length > 40 || h.quantity.scale() > 4 || h.averageCost.scale() > 4) errors["holdings.$index"] = "종목·수량·매입가·통화·분류를 확인해주세요."
            if (input.accountType != "GENERAL" && h.currency == "USD") errors["holdings.$index"] = "ISA·연금 상품은 계좌의 투자 가능 상품을 확인한 후 국내 상장 상품으로 등록해주세요."
        }
        if (errors.isNotEmpty()) throw ValidationException("포트폴리오 입력을 확인해주세요.", errors)
    }

    private fun analyze(row: Portfolio): PortfolioResponse {
        val holdings = readHoldings(row)
        val latest = briefings.findTopByOrderByBriefingDateDesc()
        val fx = latest?.usdKrw?.takeIf { it > BigDecimal.ZERO }
        val quoteMap = quotes.findAllById(holdings.map { it.symbol.uppercase() }).associateBy { it.symbol }
        val views = holdings.map { h ->
            val multiplier = if (h.currency == "KRW") BigDecimal.ONE else fx
            val quote = quoteMap[h.symbol.uppercase()]
            val invested = multiplier?.let { h.averageCost.multiply(h.quantity).multiply(it) }
            val value = multiplier?.let { rate -> quote?.price?.multiply(h.quantity)?.multiply(rate) }
            PortfolioHoldingView(h, invested, quote?.price, value, quote?.price?.let { percent(it.subtract(h.averageCost), h.averageCost) }, quote?.asOf)
        }
        val completeCost = views.all { it.investedKrw != null }
        val completeQuotes = views.all { it.valueKrw != null }
        val invested = if (completeCost) views.fold(BigDecimal.ZERO) { a, h -> a + h.investedKrw!! } else null
        val total = if (completeQuotes) views.fold(row.cash) { a, h -> a + h.valueKrw!! } else null
        val allocation = if (invested != null && invested + row.cash > BigDecimal.ZERO) {
            val grouped = views.groupBy { it.holding.assetClass }.mapValues { (_, hs) -> hs.fold(BigDecimal.ZERO) { a, h -> a + h.investedKrw!! } }
            (grouped + ("CASH" to row.cash)).mapValues { (_, amount) -> percent(amount, invested + row.cash) }
        } else emptyMap()
        val insights = mutableListOf<String>()
        if (holdings.isEmpty()) insights += "보유 자산과 현금을 등록하면 비중과 쏠림을 분석합니다."
        if (!completeQuotes) insights += "일부 시세가 없어 전체 평가금액을 확정하지 않았습니다. 비중은 매입원금 기준입니다."
        if (!completeCost) insights += "USD/KRW 기준 환율이 없어 외화 자산을 원화로 합산하지 않았습니다."
        if (views.any { it.quoteAsOf != null && java.time.Duration.between(it.quoteAsOf, Instant.now()).toDays() > 3 }) insights += "3일 이상 지난 시세가 있습니다. 기준 시각과 휴장 여부를 확인하세요."
        if (invested != null && invested > BigDecimal.ZERO) {
            views.filter { it.investedKrw!! > invested.multiply(BigDecimal("0.4")) }.forEach { insights += "${it.holding.name}: 투자원금의 40%를 초과합니다. 단일 자산 집중도를 점검하세요." }
            views.groupBy { it.holding.sector }.filterKeys { it != "미분류" && it.isNotBlank() }.forEach { (sector, hs) ->
                if (hs.fold(BigDecimal.ZERO) { a, h -> a + h.investedKrw!! } > invested.multiply(BigDecimal("0.6"))) insights += "$sector 분야가 투자원금의 60%를 초과합니다."
            }
        }
        holdings.filter { it.underlyingIndex.isNotBlank() }.groupBy { it.underlyingIndex.trim().uppercase() }.filterValues { it.size > 1 }.forEach { (index, _) -> insights += "$index 추종 상품을 여러 개 보유하고 있습니다. 같은 지수의 중복 노출을 확인하세요." }
        if (row.horizonMonths < 12) insights += "1년 이내 사용할 자금이라면 가격 변동과 현금 필요 시점을 먼저 확인하세요."
        if (row.riskLevel == "CAUTIOUS" && (allocation["STOCK"] ?: BigDecimal.ZERO) > BigDecimal("50")) insights += "안정 선호 설정에 비해 개별주식 비중이 높습니다. 목표와 비중을 다시 확인하세요."
        if (row.monthlyContribution > BigDecimal.ZERO) insights += "월 추가 투자금 ${row.monthlyContribution.toPlainString()}원: 기존 집중 자산을 늘리기 전에 부족한 자산군을 검토하세요."
        if (insights.isEmpty()) insights += "현재 규칙으로 확인된 집중 경고는 없습니다. 손실 위험이 없다는 의미는 아닙니다."
        val target = targetFor(row.riskLevel, row.horizonMonths)
        val contribution = target.mapValues { (_, weight) -> row.monthlyContribution.multiply(weight).divide(BigDecimal("100"), 0, RoundingMode.DOWN) }.toMutableMap()
        if (contribution.isNotEmpty()) contribution["CASH"] = contribution.getValue("CASH") + row.monthlyContribution - contribution.values.fold(BigDecimal.ZERO) { a, v -> a + v }
        val articles = (newsFeed.findTop50ByOrderByPubDateDescCollectedAtDesc().map { NewsArticleResponse(it.title, it.link, it.description, it.pubDate) } + latest?.id?.let { news.findByBriefingId(it).map { n -> n.toResponse() } }.orEmpty())
            .distinctBy { it.link }.filter { article -> holdings.any { h -> article.title.contains(h.name, true) || (h.symbol.length >= 3 && Regex("(?i)(?<![A-Za-z0-9])${Regex.escape(h.symbol)}(?![A-Za-z0-9])").containsMatchIn(article.title)) } }.take(10)
        return PortfolioResponse(row.version, row.goal, row.horizonMonths, row.riskLevel, row.accountType, row.monthlyContribution, row.cash, views, invested, total, if (total != null && invested != null) percent(total - row.cash - invested, invested) else null, allocation, target, contribution, insights, articles, row.updatedAt.takeIf { portfolios.existsById(row.ownerId) }, latest?.briefingDate?.toString().takeIf { fx != null })
    }

    companion object {
        // An explicit, versioned planning template, not a prediction of returns or product suitability.
        fun targetFor(risk: String, months: Int): Map<String, BigDecimal> {
            val weights = if (months < 12) mapOf("ETF" to 0, "STOCK" to 0, "BOND" to 0, "CASH" to 100) else when (risk) {
                "CAUTIOUS" -> mapOf("ETF" to 30, "STOCK" to 0, "BOND" to 40, "CASH" to 30)
                "GROWTH" -> mapOf("ETF" to 60, "STOCK" to 20, "BOND" to 10, "CASH" to 10)
                else -> mapOf("ETF" to 50, "STOCK" to 10, "BOND" to 25, "CASH" to 15)
            }
            return weights.mapValues { BigDecimal(it.value) }
        }
        fun percent(numerator: BigDecimal, denominator: BigDecimal): BigDecimal = if (denominator > BigDecimal.ZERO) numerator.multiply(BigDecimal("100")).divide(denominator, 2, RoundingMode.HALF_UP) else BigDecimal.ZERO
    }
}
