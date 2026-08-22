package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.NewsArticle
import com.firewatch.backend.entity.recommendedStocks
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

// Design Ref: §4.2 GET /api/briefings/latest 응답 형식. news는 설계 문서 원본엔 없던 필드 —
// 사용자 요청(2026-08-21)으로 추가, Gemini Search Grounding이 막혀 있어 실제 뉴스 링크로 대체.
data class NewsArticleResponse(
    val title: String,
    val link: String,
    val description: String?,
    val pubDate: Instant?,
)

fun NewsArticle.toResponse() = NewsArticleResponse(
    title = title,
    link = link,
    description = description,
    pubDate = pubDate,
)

data class BriefingResponse(
    val id: Long,
    val briefingDate: LocalDate,
    val marketSummary: String,
    val recommendedStocks: List<String>,
    val goldPrice: BigDecimal?,
    val silverPrice: BigDecimal?,
    val usdKrw: BigDecimal?,
    val jpy100Krw: BigDecimal?,
    val cnyKrw: BigDecimal?,
    val kospi: BigDecimal?,
    val kosdaq: BigDecimal?,
    val sp500: BigDecimal?,
    val nasdaq: BigDecimal?,
    val dow: BigDecimal?,
    val usBondYield10y: BigDecimal?,
    val dataSourceStatus: DataSourceStatus,
    val createdAt: Instant,
    val news: List<NewsArticleResponse>,
)

fun Briefing.toResponse(news: List<NewsArticle> = emptyList()) = BriefingResponse(
    id = id ?: error("저장되지 않은 Briefing에는 응답 DTO를 만들 수 없음"),
    briefingDate = briefingDate,
    marketSummary = marketSummary,
    recommendedStocks = recommendedStocks(),
    goldPrice = goldPrice,
    silverPrice = silverPrice,
    usdKrw = usdKrw,
    jpy100Krw = jpy100Krw,
    cnyKrw = cnyKrw,
    kospi = kospi,
    kosdaq = kosdaq,
    sp500 = sp500,
    nasdaq = nasdaq,
    dow = dow,
    usBondYield10y = usBondYield10y,
    dataSourceStatus = dataSourceStatus,
    createdAt = createdAt,
    news = news.map { it.toResponse() },
)
