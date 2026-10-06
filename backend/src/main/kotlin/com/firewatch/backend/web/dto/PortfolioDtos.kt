package com.firewatch.backend.web.dto

import java.math.BigDecimal
import java.time.Instant

data class PortfolioHoldingInput(
    val symbol: String,
    val name: String,
    val quantity: BigDecimal,
    val averageCost: BigDecimal,
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
    val analysisVersion: String = "portfolio-rules-v1",
) {
    override fun toString() = "포트폴리오 분석 $analysisVersion (자산 ${holdings.size}개)"
}
