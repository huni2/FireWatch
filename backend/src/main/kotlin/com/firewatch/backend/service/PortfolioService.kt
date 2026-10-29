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
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

@Service
class PortfolioService(
    private val identityResolver: SettingsIdentityResolver,
    private val portfolios: PortfolioRepository,
    private val revisions: PortfolioRevisionRepository,
    private val quotes: MarketQuoteRepository,
    private val briefings: BriefingRepository,
    private val news: NewsArticleRepository,
    private val newsFeed: NewsFeedRepository,
    private val catalog: InstrumentCatalog,
) : AuditedComponent {
    override val auditEventType = AuditEventType.PORTFOLIO
    private val mapper = JsonMapper.builder().findAndAddModules().build()

    private fun readHoldings(portfolio: Portfolio): List<PortfolioHoldingInput> =
        mapper.readValue(portfolio.holdingsJson, Array<PortfolioHoldingInput>::class.java).toList()

    fun get(deviceId: String): PortfolioResponse {
        val owner = identityResolver.resolveForDevice(deviceId).id
        val stored = portfolios.findById(owner).orElse(null)?.let { applyDueContribution(it) }
        return analyze(stored ?: Portfolio(ownerId = owner), stored != null)
    }

    // 조회할 때마다 납입일이 지났는지 확인해 밀린 월 추가 투자금을 현금에 반영한다(최대 12개월 소급, 그 이상은 버림).
    // 별도 배치 없이 조회 시점에 계산하므로 항상 최신이고, 사용자가 켜 둔 적 없는(lastContributionAppliedMonth=null) 상태에서는 아무 일도 하지 않는다.
    @Transactional
    fun applyDueContribution(row: Portfolio): Portfolio {
        val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
        val due = PortfolioContribution.due(row.contributionDay, row.monthlyContribution, row.lastContributionAppliedMonth, today) ?: return row
        row.cash = row.cash.add(due.amount)
        row.lastContributionAppliedMonth = due.appliedThroughMonth
        row.lastContributionAppliedAt = Instant.now()
        row.lastContributionAppliedAmount = due.amount
        row.lastContributionAppliedMonths = due.monthsApplied
        row.updatedAt = Instant.now()
        return portfolios.saveAndFlush(row)
    }

    @Transactional
    fun saveNote(deviceId: String, input: HoldingNoteRequest): PortfolioResponse {
        val symbol = input.symbol.trim().uppercase()
        val date = input.reviewDate?.trim()?.takeIf { it.isNotEmpty() }
        val errors = mutableMapOf<String, String>()
        if (input.version < 0 || !Regex("^[A-Z0-9]+(\\.[A-Z0-9]+)?$").matches(symbol) || symbol.length > 20) errors["symbol"] = "등록한 종목과 기록 버전을 확인해주세요."
        if (input.reason.length > 500) errors["reason"] = "보유 이유는 500자까지 입력해주세요."
        if (input.nextCheck.length > 500) errors["nextCheck"] = "다음 확인할 내용은 500자까지 입력해주세요."
        if (input.reflection.length > 1000) errors["reflection"] = "돌아본 내용은 1,000자까지 입력해주세요."
        if (date != null && (!Regex("\\d{4}-\\d{2}-\\d{2}").matches(date) || runCatching { LocalDate.parse(date).year in 2000..2100 }.getOrDefault(false).not())) errors["reviewDate"] = "2000~2100년의 올바른 날짜를 입력해주세요."
        if (errors.isNotEmpty()) throw ValidationException("투자 메모를 확인해주세요.", errors)
        val owner = identityResolver.resolveForDevice(deviceId).id
        val row = portfolios.findForAccountLink(owner) ?: throw ValidationException("먼저 보유 종목을 등록해주세요.", emptyMap())
        if (row.version != input.version) throw ConflictException("다른 화면에서 기록이 바뀌었어요. 메모를 복사해 둔 뒤 최신 기록을 다시 확인해주세요.")
        val notes = row.holdingNotesJson?.let { mapper.readValue(it, Array<HoldingNote>::class.java).toMutableList() } ?: mutableListOf()
        val previous = notes.find { it.symbol == symbol }
        val holding = readHoldings(row).find { it.symbol == symbol }
        if (holding == null && previous == null) throw ValidationException("등록한 보유 종목에 메모를 남겨주세요.", emptyMap())
        notes.removeAll { it.symbol == symbol }
        val reason = input.reason.trim(); val nextCheck = input.nextCheck.trim(); val reflection = input.reflection.trim()
        if (reason.isNotEmpty() || nextCheck.isNotEmpty() || reflection.isNotEmpty() || date != null) {
            if (notes.size >= 100) throw ValidationException("투자 메모는 이전 보유 종목을 포함해 100개까지 저장할 수 있어요.", emptyMap())
            notes.add(HoldingNote(symbol, holding?.name ?: previous!!.name, reason, nextCheck, date, reflection, Instant.now()))
        }
        row.holdingNotesJson = mapper.writeValueAsString(notes)
        return analyze(portfolios.saveAndFlush(row), true)
    }

    // Save a user-requested comparison baseline, without altering holdings or their edit time.
    @Transactional
    fun review(deviceId: String, input: PortfolioReviewRequest): PortfolioResponse {
        if (input.version < 0) throw ValidationException("점검할 기록 버전을 확인해주세요.", mapOf("version" to "0 이상이어야 해요."))
        val owner = identityResolver.resolveForDevice(deviceId).id
        val row = portfolios.findForAccountLink(owner)
            ?: throw ValidationException("먼저 보유 자산이나 현금을 등록해주세요.", mapOf("holdings" to "저장한 기록이 필요해요."))
        if (row.version != input.version) throw ConflictException("다른 화면에서 기록이 변경됐어요. 최신 기록을 확인한 뒤 점검을 마쳐주세요.")
        val current = analyze(row, true)
        if (current.holdings.isEmpty() && current.cash <= BigDecimal.ZERO)
            throw ValidationException("먼저 보유 자산이나 현금을 등록해주세요.", mapOf("holdings" to "보유 기록이 필요해요."))
        val checkpoint = PortfolioReviewCheckpoint(Instant.now(), current.cash,
            current.holdings, current.totalValueKrw, current.fxAsOf, current.relatedNews.map { it.link })
        row.reviewJson = mapper.writeValueAsString(checkpoint)
        val saved = portfolios.saveAndFlush(row)
        return current.copy(version = saved.version, reviewCheckpoint = checkpoint)
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
        // 납입일을 새로 설정하거나 바꾸면 이번 달은 소급하지 않고 다음 납입일부터 반영을 시작한다 — 방금 켠 설정으로 당장 현금이 느는 걸 막는다.
        if (input.contributionDay != row.contributionDay) row.lastContributionAppliedMonth = YearMonth.now(ZoneId.of("Asia/Seoul")).toString()
        row.contributionDay = input.contributionDay
        row.holdingsJson = mapper.writeValueAsString(input.holdings.map { it.copy(symbol = it.symbol.trim().uppercase(), name = it.name.trim(), underlyingIndex = it.underlyingIndex.trim().uppercase()) })
        row.updatedAt = Instant.now()
        val saved = portfolios.saveAndFlush(row)
        revisions.save(PortfolioRevision(ownerId = owner, revision = saved.version, snapshotJson = mapper.writeValueAsString(input)))
        return analyze(saved, true)
    }

    fun validate(input: PortfolioUpdateRequest) {
        val errors = mutableMapOf<String, String>()
        if (input.version < 0 || input.goal.isBlank() || input.goal.length > 120) errors["goal"] = "투자 목표는 1~120자입니다."
        if (input.horizonMonths !in 1..600) errors["horizonMonths"] = "투자 기간은 1~600개월입니다."
        if (input.riskLevel !in setOf("CAUTIOUS", "BALANCED", "GROWTH")) errors["riskLevel"] = "투자 성향을 선택해주세요."
        if (input.accountType !in setOf("GENERAL", "ISA", "PENSION")) errors["accountType"] = "계좌 종류를 선택해주세요."
        if (input.cash < BigDecimal.ZERO || input.monthlyContribution < BigDecimal.ZERO || input.cash > BigDecimal("1000000000000") || input.monthlyContribution > BigDecimal("1000000000")) errors["cash"] = "금액 범위를 확인해주세요."
        if (input.contributionDay != null && input.contributionDay !in 1..28 && input.contributionDay != PortfolioContribution.LAST_DAY_OF_MONTH) errors["contributionDay"] = "납입일은 1~28일 또는 매월 말일 중에서 선택해주세요."
        if (input.holdings.size > 50) errors["holdings"] = "보유 자산은 최대 50개입니다."
        if (input.holdings.map { it.symbol.uppercase() }.distinct().size != input.holdings.size) errors["holdings"] = "같은 티커는 합산해서 입력해주세요."
        input.holdings.forEachIndexed { index, h ->
            val kr = h.symbol.uppercase().endsWith(".KS") || h.symbol.uppercase().endsWith(".KQ")
            if (kr && h.currency != "KRW" || !kr && h.currency != "USD") errors["holdings.$index.currency"] = "국내 티커(.KS/.KQ)는 KRW, 미국 티커는 USD로 입력해주세요."
            if (!Regex("^[A-Za-z0-9]+(\\.[A-Za-z0-9]+)?$").matches(h.symbol) || h.symbol.length > 20 || h.name.isBlank() || h.name.length > 80 || h.quantity <= BigDecimal.ZERO || h.quantity > BigDecimal("1000000000") || (h.averageCost != null && (h.averageCost <= BigDecimal.ZERO || h.averageCost > BigDecimal("1000000000"))) || h.currency !in setOf("KRW", "USD") || h.assetClass !in setOf("STOCK", "ETF", "BOND", "OTHER") || h.region !in setOf("KR", "US", "GLOBAL") || h.sector.length > 40 || h.underlyingIndex.length > 40 || h.quantity.scale() > 4 || (h.averageCost != null && h.averageCost.scale() > 4)) errors["holdings.$index"] = "종목·수량·매입가·통화·분류를 확인해주세요."
            if (input.accountType != "GENERAL" && h.currency == "USD") errors["holdings.$index"] = "ISA·연금 상품은 계좌의 투자 가능 상품을 확인한 후 국내 상장 상품으로 등록해주세요."
        }
        if (errors.isNotEmpty()) throw ValidationException("포트폴리오 입력을 확인해주세요.", errors)
    }

    private fun analyze(row: Portfolio, persisted: Boolean): PortfolioResponse {
        val holdings = readHoldings(row)
        val latest = if (holdings.isEmpty()) null else briefings.findTopByOrderByBriefingDateDesc()
        val fx = latest?.usdKrw?.takeIf { it > BigDecimal.ZERO }
        val quoteMap = quotes.findAllById(holdings.map { it.symbol.uppercase() }).associateBy { it.symbol }
        val views = holdings.map { h ->
            val multiplier = if (h.currency == "KRW") BigDecimal.ONE else fx
            val quote = quoteMap[h.symbol.uppercase()]?.takeIf { it.price > BigDecimal.ZERO }
            val invested = h.averageCost?.let { cost -> multiplier?.let { cost.multiply(h.quantity).multiply(it) } }
            val value = multiplier?.let { rate -> quote?.price?.multiply(h.quantity)?.multiply(rate) }
            PortfolioHoldingView(h, invested, quote?.price, value, h.averageCost?.let { cost -> quote?.price?.let { percent(it.subtract(cost), cost) } }, quote?.asOf)
        }
        val completeCost = views.all { it.investedKrw != null }
        val completeQuotes = views.all { it.valueKrw != null }
        val invested = if (completeCost) views.fold(BigDecimal.ZERO) { a, h -> a + h.investedKrw!! } else null
        val total = if (completeQuotes) views.fold(row.cash) { a, h -> a + h.valueKrw!! } else null
        val priced = views.filter { it.valueKrw != null }
        val includedValue = priced.fold(row.cash) { a, h -> a + h.valueKrw!! }
        val coverage = ValuationCoverage(priced.size, views.size, includedValue, views.filter { it.valueKrw == null }.map { it.holding.name })
        val allocation = if (includedValue > BigDecimal.ZERO) {
            val grouped = priced.groupBy { it.holding.assetClass }.mapValues { (_, hs) -> hs.fold(BigDecimal.ZERO) { a, h -> a + h.valueKrw!! } }
            (grouped + ("CASH" to row.cash)).mapValues { (_, amount) -> percent(amount, includedValue) }
        } else emptyMap()
        val insights = mutableListOf<String>()
        if (holdings.isEmpty()) insights += "보유 자산과 현금을 등록하면 비중과 쏠림을 분석합니다."
        if (!completeQuotes) insights += "일부 가격 또는 환율이 없어 전체 평가금액을 확정하지 않았어요. 비중은 평가 가능한 자산과 현금 기준이에요."
        if (holdings.any { it.averageCost == null }) insights += "매입가가 없는 자산이 있어 전체 투자원금과 손익을 계산하지 않았어요."
        if (holdings.any { it.currency == "USD" } && fx == null) insights += "환율 자료가 없어 달러 자산을 원화로 합산하지 않았어요."
        if (views.any { it.quoteAsOf != null && java.time.Duration.between(it.quoteAsOf, Instant.now()).toDays() > 3 }) insights += "3일 이상 지난 시세가 있습니다. 기준 시각과 휴장 여부를 확인하세요."
        if (priced.size > 1 && includedValue > BigDecimal.ZERO) {
            priced.filter { it.valueKrw!! > includedValue.multiply(BigDecimal("0.4")) }.forEach { insights += "등록한 자산에서 ${it.holding.name} 비중이 40%를 넘어요. 보유 구성을 확인해보세요." }
            priced.groupBy { it.holding.sector }.filterKeys { it != "미분류" && it.isNotBlank() }.forEach { (sector, hs) ->
                if (hs.fold(BigDecimal.ZERO) { a, h -> a + h.valueKrw!! } > includedValue.multiply(BigDecimal("0.6"))) insights += "평가 가능한 등록 자산에서 $sector 분야가 60%를 넘어요."
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
        val metadata = catalog.metadataFor(holdings.map { it.symbol })
        val namePatterns = holdings.flatMap { h ->
            val item = metadata[h.symbol]
            (listOfNotNull(h.name, item?.name, h.symbol, h.symbol.removeSuffix(".KS").removeSuffix(".KQ")) + item?.aliases.orEmpty().filter { it.trim().length >= 3 })
                .map { it.trim() }.filter { it.length >= 2 }
        }.distinct().map { name ->
            if (name.any { it in 'A'..'Z' || it in 'a'..'z' || it in '0'..'9' }) Regex("(?i)(?<![A-Za-z0-9])${Regex.escape(name)}(?![A-Za-z0-9])")
            else Regex(Regex.escape(name))
        }
        val articles = (if (holdings.isEmpty()) emptyList() else newsFeed.findTop200ByOrderByPubDateDescCollectedAtDesc().map { NewsArticleResponse(it.title, it.link, it.description, it.pubDate) } + latest?.id?.let { news.findByBriefingId(it).map { n -> n.toResponse() } }.orEmpty())
            .distinctBy { it.link }.filter { article ->
                val text = "${article.title} ${article.description.orEmpty()}"
                namePatterns.any { it.containsMatchIn(text) }
            }.sortedByDescending { it.pubDate }.take(10)
        return PortfolioResponse(row.version, row.goal, row.horizonMonths, row.riskLevel, row.accountType, row.monthlyContribution, row.cash, views, invested, total, if (total != null && invested != null) percent(total - row.cash - invested, invested) else null, allocation, target, contribution, insights, articles, row.updatedAt.takeIf { persisted }, latest?.briefingDate?.toString().takeIf { fx != null }, exposure = PortfolioExposureAnalysis.analyze(views, row.cash), valuationCoverage = coverage,
            reviewCheckpoint = row.reviewJson?.let { mapper.readValue(it, PortfolioReviewCheckpoint::class.java) },
            holdingNotes = row.holdingNotesJson?.let { mapper.readValue(it, Array<HoldingNote>::class.java).toList() }.orEmpty(),
            contributionDay = row.contributionDay,
            lastContributionAppliedAt = row.lastContributionAppliedAt,
            lastContributionAppliedAmount = row.lastContributionAppliedAmount,
            lastContributionAppliedMonths = row.lastContributionAppliedMonths)
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
