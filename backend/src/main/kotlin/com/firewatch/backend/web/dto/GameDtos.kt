package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.service.GameHolding
import com.firewatch.backend.service.GameTurnSnapshot
import jakarta.validation.constraints.DecimalMin
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

// Design Ref: 가상투자 게임(2026-10-05) — POST /api/game/trade 요청.
data class GameTradeRequest(
    val instrumentType: GameInstrumentType,
    val symbol: String? = null,
    val action: GameTradeAction,
    @field:DecimalMin(value = "0.0001", message = "수량은 0보다 커야 합니다")
    val quantity: BigDecimal,
)

data class GameHoldingResponse(
    val instrumentType: GameInstrumentType,
    val symbol: String?,
    val quantity: BigDecimal,
    val currentPrice: BigDecimal?,
    val value: BigDecimal,
)

fun GameHolding.toResponse() = GameHoldingResponse(
    instrumentType = instrumentType,
    symbol = symbol,
    quantity = quantity,
    currentPrice = currentPrice,
    value = value,
)

// briefing은 기존 BriefingResponse를 그대로 재사용 — 그 턴 날짜의 실제 뉴스·지표·AI추천종목이
// 전부 이미 그 DTO에 들어있다.
data class GameTurnResponse(
    val sessionId: Long,
    val status: GameSessionStatus,
    val turnIndex: Int,
    val totalTurns: Int,
    val turnDate: LocalDate,
    val briefing: BriefingResponse,
    val holdings: List<GameHoldingResponse>,
    val cash: BigDecimal,
    val portfolioValue: BigDecimal,
    val startingCash: BigDecimal,
    val returnPercent: BigDecimal,
)

fun GameTurnSnapshot.toResponse() = GameTurnResponse(
    sessionId = sessionId,
    status = status,
    turnIndex = turnIndex,
    totalTurns = totalTurns,
    turnDate = turnDate,
    briefing = briefing.toResponse(news),
    holdings = holdings.map { it.toResponse() },
    cash = cash,
    portfolioValue = portfolioValue,
    startingCash = startingCash,
    returnPercent = if (startingCash > BigDecimal.ZERO) {
        portfolioValue.subtract(startingCash).divide(startingCash, 4, RoundingMode.HALF_UP).multiply(BigDecimal(100))
    } else {
        BigDecimal.ZERO
    },
)
