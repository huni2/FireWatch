package com.firewatch.backend.service

import com.firewatch.backend.web.dto.PortfolioHoldingView
import java.math.BigDecimal

data class HoldingWeight(val name: String, val weightPercent: BigDecimal)
data class IndexOverlap(val index: String, val names: List<String>)
data class PortfolioExposure(val complete: Boolean, val sectorWeights: Map<String, BigDecimal>,
    val tradingCurrencyWeights: Map<String, BigDecimal>, val largestHoldings: List<HoldingWeight>,
    val indexOverlaps: List<IndexOverlap>, val usdFxDown10ImpactKrw: BigDecimal?)

/** Descriptive calculations only. KRW-traded ETFs may also have FX risk; do not infer hedge status. */
object PortfolioExposureAnalysis {
    fun analyze(views: List<PortfolioHoldingView>, cash: BigDecimal): PortfolioExposure {
        val overlaps = views.filter { it.holding.assetClass == "ETF" && it.holding.underlyingIndex.isNotBlank() }
            .groupBy { normalizeIndex(it.holding.underlyingIndex) }.filterValues { it.size > 1 }
            .map { (index, rows) -> IndexOverlap(index, rows.map { it.holding.name }) }
        val priced = views.filter { it.valueKrw != null }
        val total = cash + priced.fold(BigDecimal.ZERO) { a, v -> a + v.valueKrw!! }
        fun weights(groups: Map<String, List<PortfolioHoldingView>>) = groups.mapValues { (_, rows) -> PortfolioService.percent(rows.fold(BigDecimal.ZERO) { a, v -> a + v.valueKrw!! }, total) }
        val sectors = weights(priced.groupBy { if (it.holding.assetClass == "ETF") "ETF 구성 미확인" else it.holding.sector.ifBlank { "미분류" } }) + ("현금" to PortfolioService.percent(cash, total))
        val currencies = weights(priced.groupBy { it.holding.currency }).toMutableMap()
        currencies["KRW"] = (currencies["KRW"] ?: BigDecimal.ZERO) + PortfolioService.percent(cash, total)
        val usdRows = views.filter { it.holding.currency == "USD" }
        val usd = if (usdRows.all { it.investedKrw != null }) usdRows.fold(BigDecimal.ZERO) { a, v -> a + v.investedKrw!! } else null
        return PortfolioExposure(priced.size == views.size, sectors, currencies, priced.sortedByDescending { it.valueKrw }.take(3).map { HoldingWeight(it.holding.name, PortfolioService.percent(it.valueKrw!!, total)) }, overlaps, usd?.multiply(BigDecimal("-0.10")))
    }
    private fun normalizeIndex(value: String) = value.uppercase().replace(Regex("[\\s&._-]"), "")
}
