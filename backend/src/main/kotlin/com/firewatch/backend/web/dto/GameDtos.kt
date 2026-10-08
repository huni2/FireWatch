package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.GameDifficulty
import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.service.GameHolding
import com.firewatch.backend.service.GameTurnSnapshot
import com.firewatch.backend.entity.GameTransaction
import jakarta.validation.constraints.DecimalMin
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

// Design Ref: 가상투자 게임(2026-10-05) — POST /api/game/start 요청. 이미 활성 세션이 있으면
// 둘 다 무시되고(GameService.startGame 참고) 기존 세션을 그대로 돌려준다.
data class GameStartRequest(
    val difficulty: GameDifficulty = GameDifficulty.NORMAL,
    val allowShortSelling: Boolean = false,
)

// Design Ref: 가상투자 게임(2026-10-05) — POST /api/game/trade 요청.
data class GameTradeRequest(
    val instrumentType: GameInstrumentType,
    val symbol: String? = null,
    val action: GameTradeAction,
    @field:DecimalMin(value = "0.0001", message = "수량은 0보다 커야 합니다")
    val quantity: BigDecimal,
    val requestId: String? = null,
    val expectedTurnIndex: Int? = null,
    val expectedPrice: BigDecimal? = null,
)

data class GameHoldingResponse(
    val instrumentType: GameInstrumentType,
    val symbol: String?,
    val quantity: BigDecimal,
    val currentPrice: BigDecimal?,
    val value: BigDecimal?,
)

fun GameHolding.toResponse() = GameHoldingResponse(
    instrumentType = instrumentType,
    symbol = symbol,
    quantity = quantity,
    currentPrice = currentPrice,
    value = value,
)

// 기존 BriefingResponse 계약을 재사용한다. 새 게임은 가상 자료,
// simulation=false인 기존 세션은 보관된 과거 자료를 반환한다.
data class GameTurnResponse(
    val sessionId: Long,
    val status: GameSessionStatus,
    val turnIndex: Int,
    val totalTurns: Int,
    val turnDate: LocalDate,
    val briefing: BriefingResponse,
    val holdings: List<GameHoldingResponse>,
    val cash: BigDecimal,
    val portfolioValue: BigDecimal?,
    val startingCash: BigDecimal,
    val allowShortSelling: Boolean,
    val returnPercent: BigDecimal?,
    val benchmarkReturnPercent: BigDecimal?,
    val review: List<String>,
    val transactions: List<GameTransactionResponse>,
    val turnChange: BigDecimal?,
    val simulation: Boolean,
    val simulationVersion: Int?,
    val stockPrices: Map<String, BigDecimal>,
    val marketEvents: List<com.firewatch.backend.service.GameMarketEvent>,
    val turnContributions: List<com.firewatch.backend.service.GameTurnContribution>,
    val assetHistories: List<com.firewatch.backend.service.GameAssetHistory> = emptyList(),
    val gamePicks: List<com.firewatch.backend.service.GamePick> = emptyList(),
    val priceDrivers: List<com.firewatch.backend.service.GamePriceDriver> = emptyList(),
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
    allowShortSelling = allowShortSelling,
    benchmarkReturnPercent = benchmarkReturnPercent,
    review = review,
    transactions = transactions.map { GameTransactionResponse(it.id!!, it.turnIndex, it.instrumentType, it.symbol, it.action, it.quantity, it.price, it.price.multiply(it.quantity)) },
    turnChange = turnChange,
    simulation = simulation,
    simulationVersion = simulationVersion,
    stockPrices = stockPrices,
    marketEvents = marketEvents,
    turnContributions = turnContributions,
    assetHistories = assetHistories,
    gamePicks = gamePicks,
    priceDrivers = priceDrivers,
    returnPercent = if (portfolioValue != null && startingCash > BigDecimal.ZERO) {
        portfolioValue.subtract(startingCash).divide(startingCash, 4, RoundingMode.HALF_UP).multiply(BigDecimal(100))
    } else {
        null
    },
)

data class GameTransactionResponse(val id: Long, val turnIndex: Int, val instrumentType: GameInstrumentType, val symbol: String?, val action: GameTradeAction, val quantity: BigDecimal, val price: BigDecimal, val total: BigDecimal)
