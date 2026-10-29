package com.firewatch.backend.web.dto

import java.math.BigDecimal
import java.time.Instant

data class PortfolioHoldingInput(
    val symbol: String,
    val name: String,
    val quantity: BigDecimal,
    val averageCost: BigDecimal? = null,
    val currency: String = "KRW",
    val assetClass: String = "STOCK",
    val sector: String = "미분류",
    val region: String = "KR",
    val underlyingIndex: String = "",
)

data class PortfolioUpdateRequest(
    val version: Long,
    val goal: String,
    val horizonMonths: Int,
    val riskLevel: String,
    val accountType: String,
    val monthlyContribution: BigDecimal,
    val cash: BigDecimal,
    val holdings: List<PortfolioHoldingInput>,
    val contributionDay: Int? = null,
) {
    override fun toString() = "포트폴리오 변경 v$version (자산 ${holdings.size}개)"
}

data class PortfolioHoldingView(
    val holding: PortfolioHoldingInput,
    val investedKrw: BigDecimal?,
    val currentPrice: BigDecimal?,
    val valueKrw: BigDecimal?,
    val returnPercent: BigDecimal?,
    val quoteAsOf: Instant?,
)

data class ValuationCoverage(val pricedHoldings: Int, val totalHoldings: Int, val includedValueKrw: BigDecimal, val missingNames: List<String>)

data class PortfolioReviewRequest(val version: Long)
data class HoldingNoteRequest(val version: Long, val symbol: String, val reason: String = "",
    val nextCheck: String = "", val reviewDate: String? = null, val reflection: String = "") {
    override fun toString() = "투자 메모 변경 v$version (내용 비공개)"
}
data class HoldingNote(val symbol: String, val name: String, val reason: String, val nextCheck: String,
    val reviewDate: String?, val reflection: String, val updatedAt: Instant) {
    override fun toString() = "투자 메모 (내용 비공개)"
}
data class PortfolioReviewCheckpoint(val reviewedAt: Instant, val cash: BigDecimal,
    val holdings: List<PortfolioHoldingView>, val totalValueKrw: BigDecimal?,
    val fxAsOf: String?, val newsLinks: List<String>)

data class PortfolioResponse(
    val version: Long,
    val goal: String,
    val horizonMonths: Int,
    val riskLevel: String,
    val accountType: String,
    val monthlyContribution: BigDecimal,
    val cash: BigDecimal,
    val holdings: List<PortfolioHoldingView>,
    val investedKrw: BigDecimal?,
    val totalValueKrw: BigDecimal?,
    val returnPercent: BigDecimal?,
    val allocation: Map<String, BigDecimal>,
    val targetAllocation: Map<String, BigDecimal>,
    val contributionPlan: Map<String, BigDecimal>,
    val insights: List<String>,
    val relatedNews: List<NewsArticleResponse>,
    val updatedAt: Instant?,
    val fxAsOf: String?,
    val analysisVersion: String = "portfolio-rules-v3",
    val exposure: com.firewatch.backend.service.PortfolioExposure? = null,
    val allocationBasis: String = "MARKET_VALUE",
    val valuationCoverage: ValuationCoverage? = null,
    val reviewCheckpoint: PortfolioReviewCheckpoint? = null,
    val holdingNotes: List<HoldingNote> = emptyList(),
    val contributionDay: Int? = null,
    val lastContributionAppliedAt: Instant? = null,
    val lastContributionAppliedAmount: BigDecimal? = null,
    val lastContributionAppliedMonths: Int? = null,
) {
    override fun toString() = "포트폴리오 분석 $analysisVersion (자산 ${holdings.size}개)"
}
