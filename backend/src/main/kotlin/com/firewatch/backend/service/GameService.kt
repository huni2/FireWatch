package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.GameDifficulty
import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameSession
import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.entity.GameTransaction
import com.firewatch.backend.entity.NewsArticle
import com.firewatch.backend.entity.turnDates
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.GameSessionRepository
import com.firewatch.backend.repository.GameTransactionRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.ValidationException
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

// 한 홀딩의 식별 키 — 매크로 자산은 symbol이 없고, STOCK은 symbol로 구분한다.
data class GameHoldingKey(val instrumentType: GameInstrumentType, val symbol: String?)

data class GameHolding(
    val instrumentType: GameInstrumentType,
    val symbol: String?,
    val quantity: BigDecimal,
    val currentPrice: BigDecimal?,
    val value: BigDecimal,
)

data class GameTurnSnapshot(
    val sessionId: Long,
    val status: GameSessionStatus,
    val turnIndex: Int,
    val totalTurns: Int,
    val turnDate: LocalDate,
    val briefing: Briefing,
    val news: List<NewsArticle>,
    val holdings: List<GameHolding>,
    val cash: BigDecimal,
    val portfolioValue: BigDecimal,
    val startingCash: BigDecimal,
    val allowShortSelling: Boolean,
) {
    // 감사로그 응답요약이 Briefing·NewsArticle 원시 객체를 그대로 찍지 않도록(2026-10-05 BE-15와
    // 동일한 이유) 턴 진행 상황만 한 줄로 요약한다.
    override fun toString(): String =
        "턴 ${turnIndex + 1}/$totalTurns($turnDate, $status) · 포트폴리오 ${portfolioValue.toPlainString()}원"
}

// Design Ref: 가상투자 게임(2026-10-05) — 실제로 쌓인 Briefing 날짜를 셔플해 턴 덱으로 삼고, 매
// 턴 그 날짜의 실제 뉴스·지표·AI추천종목을 보여주며 매크로 지표·개별 종목을 가상매매한다.
// 개별 종목 가격은 StockApiClient(StockService 경유)로 그 턴의 실제 날짜 종가를 그때그때 조회 —
// 별도 가격 데이터 저장·합성이 필요 없다.
@Service
class GameService(
    private val briefingRepository: BriefingRepository,
    private val newsArticleRepository: NewsArticleRepository,
    private val gameSessionRepository: GameSessionRepository,
    private val gameTransactionRepository: GameTransactionRepository,
    private val stockService: StockService,
) : AuditedComponent {
    override val auditEventType = AuditEventType.GAME

    fun startGame(deviceId: String, difficulty: GameDifficulty, allowShortSelling: Boolean): GameTurnSnapshot {
        // 이미 진행 중인 게임이 있으면 난이도·공매도 설정은 무시하고 그대로 이어서 반환한다 —
        // 둘 다 "게임 시작 시점에만 고르는 값"이라 중간에 바꾸려면 새 게임을 시작해야 한다(ENDED
        // 상태가 되면 findByDeviceIdAndStatus(ACTIVE)가 null을 반환해 자연스럽게 새 게임이 된다).
        val existing = gameSessionRepository.findByDeviceIdAndStatus(deviceId, GameSessionStatus.ACTIVE)
        if (existing != null) return buildTurnSnapshot(existing)

        val allDates = briefingRepository.findAll().map { it.briefingDate }.distinct()
        if (allDates.isEmpty()) {
            throw ValidationException("아직 쌓인 브리핑 데이터가 없어 게임을 시작할 수 없습니다.", emptyMap())
        }
        val session = gameSessionRepository.save(
            GameSession(
                deviceId = deviceId,
                turnDatesRaw = allDates.shuffled().joinToString(",") { it.toString() },
                startingCash = startingCashFor(difficulty),
                allowShortSelling = allowShortSelling,
            ),
        )
        return buildTurnSnapshot(session)
    }

    fun getCurrentTurn(deviceId: String): GameTurnSnapshot = buildTurnSnapshot(activeSessionOrThrow(deviceId))

    fun trade(
        deviceId: String,
        instrumentType: GameInstrumentType,
        symbol: String?,
        action: GameTradeAction,
        quantity: BigDecimal,
    ): GameTurnSnapshot {
        if (quantity <= BigDecimal.ZERO) {
            throw ValidationException("수량은 0보다 커야 합니다.", mapOf("quantity" to quantity.toPlainString()))
        }
        if (instrumentType == GameInstrumentType.STOCK && symbol.isNullOrBlank()) {
            throw ValidationException("개별 종목은 symbol이 필요합니다.", mapOf("instrumentType" to instrumentType.name))
        }

        val session = activeSessionOrThrow(deviceId)
        val turnDate = session.turnDates()[session.currentTurnIndex]
        val briefing = briefingRepository.findByBriefingDate(turnDate)
            ?: error("턴 날짜의 브리핑을 찾을 수 없음: $turnDate")
        val price = resolvePrice(instrumentType, symbol, briefing, turnDate)
            ?: throw ValidationException(
                "이 턴에는 해당 자산의 가격 정보가 없습니다.",
                mapOf("instrumentType" to instrumentType.name, "symbol" to (symbol ?: "")),
            )

        val key = GameHoldingKey(instrumentType, symbol)
        when (action) {
            GameTradeAction.BUY -> {
                val cost = price.multiply(quantity)
                val cash = computeCash(session)
                if (cost > cash) {
                    throw ValidationException(
                        "현금이 부족합니다.",
                        mapOf("필요" to cost.toPlainString(), "보유" to cash.toPlainString()),
                    )
                }
            }
            GameTradeAction.SELL -> {
                val owned = computeHoldingQuantities(session)[key] ?: BigDecimal.ZERO
                // 공매도 허용 세션이면 보유량을 넘는 매도도 허용 — 결과적으로 보유 수량이 음수(공매도
                // 포지션)가 되고, 나중에 가격이 오르면 포트폴리오 가치가 그만큼 줄어드는 걸로 자연히
                // 반영된다(별도 롱/숏 분기 없이 기존 수량·현금 계산 로직을 그대로 재사용).
                if (!session.allowShortSelling && quantity > owned) {
                    throw ValidationException("보유 수량보다 많이 팔 수 없습니다.", mapOf("보유" to owned.toPlainString()))
                }
            }
        }

        gameTransactionRepository.save(
            GameTransaction(
                sessionId = session.id!!,
                turnIndex = session.currentTurnIndex,
                instrumentType = instrumentType,
                symbol = symbol,
                action = action,
                quantity = quantity,
                price = price,
            ),
        )
        return buildTurnSnapshot(session)
    }

    fun nextTurn(deviceId: String): GameTurnSnapshot {
        val session = activeSessionOrThrow(deviceId)
        val totalTurns = session.turnDates().size
        if (session.currentTurnIndex + 1 >= totalTurns) {
            session.status = GameSessionStatus.ENDED
            session.endedAt = Instant.now()
        } else {
            session.currentTurnIndex += 1
        }
        gameSessionRepository.save(session)
        return buildTurnSnapshot(session)
    }

    private fun activeSessionOrThrow(deviceId: String): GameSession =
        gameSessionRepository.findByDeviceIdAndStatus(deviceId, GameSessionStatus.ACTIVE)
            ?: throw NotFoundException("진행 중인 게임이 없습니다. 먼저 시작해주세요.")

    private fun resolvePrice(
        instrumentType: GameInstrumentType,
        symbol: String?,
        briefing: Briefing,
        turnDate: LocalDate,
    ): BigDecimal? = when (instrumentType) {
        GameInstrumentType.GOLD -> briefing.goldPrice
        GameInstrumentType.SILVER -> briefing.silverPrice
        GameInstrumentType.USD -> briefing.usdKrw
        GameInstrumentType.KOSPI -> briefing.kospi
        GameInstrumentType.KOSDAQ -> briefing.kosdaq
        GameInstrumentType.SP500 -> briefing.sp500
        GameInstrumentType.NASDAQ -> briefing.nasdaq
        GameInstrumentType.DOW -> briefing.dow
        GameInstrumentType.STOCK -> symbol?.let { resolveStockPriceAt(it, turnDate) }
    }

    // 그 턴의 실제 날짜(turnDate) 기준으로 가장 가까운 과거(또는 당일) 거래일 종가를 찾는다 —
    // 턴 순서가 셔플돼 있어도 개별 종목 가격은 항상 "실제로 그날 있었던" 값이다.
    private fun resolveStockPriceAt(symbol: String, date: LocalDate): BigDecimal? {
        val history = runCatching { stockService.fetchPriceHistory(symbol, StockRange.SIX_MONTH) }.getOrNull()
            ?: return null
        val dated = history.points.mapNotNull { point ->
            runCatching { Instant.parse(point.timestamp).atZone(ZoneOffset.UTC).toLocalDate() }
                .getOrNull()
                ?.let { it to point.close }
        }
        return dated.filter { it.first <= date }.maxByOrNull { it.first }?.second
            ?: dated.minByOrNull { it.first }?.second
    }

    private fun computeHoldingQuantities(session: GameSession): Map<GameHoldingKey, BigDecimal> {
        val txs = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)
        val holdings = mutableMapOf<GameHoldingKey, BigDecimal>()
        for (tx in txs) {
            val key = GameHoldingKey(tx.instrumentType, tx.symbol)
            val current = holdings[key] ?: BigDecimal.ZERO
            holdings[key] = when (tx.action) {
                GameTradeAction.BUY -> current.add(tx.quantity)
                GameTradeAction.SELL -> current.subtract(tx.quantity)
            }
        }
        // 0이 된 포지션만 빼고, 공매도로 음수가 된 포지션은 그대로 남긴다(보유 자산 목록에 "공매도
        // 중"으로 보여줘야 하므로).
        return holdings.filterValues { it != BigDecimal.ZERO }
    }

    private fun computeCash(session: GameSession): BigDecimal {
        val txs = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)
        var cash = session.startingCash
        for (tx in txs) {
            val amount = tx.price.multiply(tx.quantity)
            cash = when (tx.action) {
                GameTradeAction.BUY -> cash.subtract(amount)
                GameTradeAction.SELL -> cash.add(amount)
            }
        }
        return cash
    }

    private fun buildTurnSnapshot(session: GameSession): GameTurnSnapshot {
        val turnDates = session.turnDates()
        val turnDate = turnDates[session.currentTurnIndex]
        val briefing = briefingRepository.findByBriefingDate(turnDate)
            ?: error("턴 날짜의 브리핑을 찾을 수 없음: $turnDate")
        val news = newsArticleRepository.findByBriefingId(briefing.id!!)
        val cash = computeCash(session)
        val holdings = computeHoldingQuantities(session).map { (key, quantity) ->
            val price = resolvePrice(key.instrumentType, key.symbol, briefing, turnDate)
            GameHolding(
                instrumentType = key.instrumentType,
                symbol = key.symbol,
                quantity = quantity,
                currentPrice = price,
                value = (price ?: BigDecimal.ZERO).multiply(quantity),
            )
        }
        val portfolioValue = holdings.fold(cash) { acc, holding -> acc.add(holding.value) }

        return GameTurnSnapshot(
            sessionId = session.id!!,
            status = session.status,
            turnIndex = session.currentTurnIndex,
            totalTurns = turnDates.size,
            turnDate = turnDate,
            briefing = briefing,
            news = news,
            holdings = holdings,
            cash = cash,
            portfolioValue = portfolioValue.setScale(2, RoundingMode.HALF_UP),
            startingCash = session.startingCash,
            allowShortSelling = session.allowShortSelling,
        )
    }

    // 난이도 = 시작 자금(2026-10-05 사용자 요청) — 금액은 서버가 고정, 클라이언트는 난이도 이름만 고른다.
    private fun startingCashFor(difficulty: GameDifficulty): BigDecimal = when (difficulty) {
        GameDifficulty.EASY -> BigDecimal("20000000")
        GameDifficulty.NORMAL -> BigDecimal("10000000")
        GameDifficulty.HARD -> BigDecimal("5000000")
    }
}
