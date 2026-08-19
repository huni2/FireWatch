package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.recommendedStocks
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

// Design Ref: §4.2 GET /api/briefings/latest 응답 형식
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
    val dataSourceStatus: DataSourceStatus,
    val createdAt: Instant,
)

fun Briefing.toResponse() = BriefingResponse(
    id = id ?: error("저장되지 않은 Briefing에는 응답 DTO를 만들 수 없음"),
    briefingDate = briefingDate,
    marketSummary = marketSummary,
    recommendedStocks = recommendedStocks(),
    goldPrice = goldPrice,
    silverPrice = silverPrice,
    usdKrw = usdKrw,
    jpy100Krw = jpy100Krw,
    cnyKrw = cnyKrw,
    dataSourceStatus = dataSourceStatus,
    createdAt = createdAt,
)
