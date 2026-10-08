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
import com.firewatch.backend.entity.GamePriceSnapshot
import com.firewatch.backend.repository.GamePriceSnapshotRepository
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.ValidationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

// 한 홀딩의 식별 키 — 매크로 자산은 symbol이 없고, STOCK은 symbol로 구분한다.
data class GameHoldingKey(val instrumentType: GameInstrumentType, val symbol: String?)
data class GameTurnContribution(val instrumentType: GameInstrumentType, val symbol: String?, val name: String, val carriedQuantity: BigDecimal, val previousPrice: BigDecimal?, val currentPrice: BigDecimal?, val profit: BigDecimal?, val reason: String)

data class GameHolding(
    val instrumentType: GameInstrumentType,
    val symbol: String?,
    val quantity: BigDecimal,
    val currentPrice: BigDecimal?,
    val value: BigDecimal?,
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
    val portfolioValue: BigDecimal?,
    val startingCash: BigDecimal,
    val allowShortSelling: Boolean,
    val benchmarkReturnPercent: BigDecimal? = null,
    val review: List<String> = emptyList(),
    val transactions: List<GameTransaction> = emptyList(),
    val turnChange: BigDecimal? = null,
    val simulation: Boolean = false,
    val simulationVersion: Int? = null,
    val stockPrices: Map<String, BigDecimal> = emptyMap(),
    val marketEvents: List<GameMarketEvent> = emptyList(),
    val turnContributions: List<GameTurnContribution> = emptyList(),
    val assetHistories: List<GameAssetHistory> = emptyList(),
    val gamePicks: List<GamePick> = emptyList(),
    val priceDrivers: List<GamePriceDriver> = emptyList(),
) {
    // 감사로그 응답요약이 Briefing·NewsArticle 원시 객체를 그대로 찍지 않도록(2026-10-05 BE-15와
    // 동일한 이유) 턴 진행 상황만 한 줄로 요약한다.
    override fun toString(): String =
        "턴 ${turnIndex + 1}/$totalTurns($turnDate, $status) · 평가 ${portfolioValue?.toPlainString() ?: "미확정"}"
}

// 2026-10-07 사용자 확정: 새 세션은 뉴스·지표·종목·가격·픽이 모두 가상인 24턴 게임이다.
// 시드를 저장해 재조회·재시작에도 같은 상태를 재현하며 외부 제공처를 호출하지 않는다.
// 기존 과거 자료 세션만 이전 가격 조회/스냅샷 경로를 유지한다. 새 게임 전환 시 기록을 보존한다.
@Service
@Transactional
class GameService(
    private val briefingRepository: BriefingRepository,
    private val newsArticleRepository: NewsArticleRepository,
    private val gameSessionRepository: GameSessionRepository,
    private val gameTransactionRepository: GameTransactionRepository,
    private val stockService: StockService,
    private val priceSnapshots: GamePriceSnapshotRepository? = null,
) : AuditedComponent {
    override val auditEventType = AuditEventType.GAME

    fun startGame(deviceId: String, difficulty: GameDifficulty, allowShortSelling: Boolean): GameTurnSnapshot {
        // 이미 진행 중인 게임이 있으면 난이도·공매도 설정은 무시하고 그대로 이어서 반환한다 —
        // 둘 다 "게임 시작 시점에만 고르는 값"이라 중간에 바꾸려면 새 게임을 시작해야 한다(ENDED
        // 상태가 되면 findByDeviceIdAndStatus(ACTIVE)가 null을 반환해 자연스럽게 새 게임이 된다).
        val existing = gameSessionRepository.findByDeviceIdAndStatus(deviceId, GameSessionStatus.ACTIVE)
        if (existing?.simulationSeed != null) return buildTurnSnapshot(existing)
        if (existing != null) {
            // Preserve historical records; start a separate fully fictional session.
            existing.status = GameSessionStatus.ENDED
            existing.endedAt = Instant.now()
            gameSessionRepository.saveAndFlush(existing)
        }
        val seed = java.util.concurrent.ThreadLocalRandom.current().nextLong()
        val version = GameSimulation.CURRENT_VERSION
        val allDates = GameSimulation.forVersion(version).dates(seed)
        val session = gameSessionRepository.save(
            GameSession(
                deviceId = deviceId,
                turnDatesRaw = allDates.joinToString(",") { it.toString() },
                startingCash = startingCashFor(difficulty),
                allowShortSelling = allowShortSelling,
                simulationSeed = seed,
                simulationVersion = version,
            ),
        )
        return buildTurnSnapshot(session)
    }

    fun getCurrentTurn(deviceId: String): GameTurnSnapshot = buildTurnSnapshot(activeSessionOrThrow(deviceId))

    // Ranking submissions lock the same game row as trades/turn advances and derive
    // the score from the persisted ledger, never from a client-supplied balance.
    fun getRankingSnapshot(deviceId: String, sessionId: Long): GameTurnSnapshot {
        val session = gameSessionRepository.findByIdAndDeviceId(sessionId, deviceId)
            ?: throw NotFoundException("이 기기의 게임 기록을 찾을 수 없습니다.")
        if (session.simulationSeed == null) throw ValidationException("완전 가상 게임 기록만 순위에 등록할 수 있습니다.", emptyMap())
        return buildTurnSnapshot(session)
    }

    fun trade(
        deviceId: String,
        instrumentType: GameInstrumentType,
        symbol: String?,
        action: GameTradeAction,
        quantity: BigDecimal,
        requestId: String? = null,
        expectedTurnIndex: Int? = null,
        expectedPrice: BigDecimal? = null,
    ): GameTurnSnapshot {
        if (quantity <= BigDecimal.ZERO || quantity.scale() > 4 || quantity > BigDecimal("1000000000")) {
            throw ValidationException("수량은 0보다 커야 합니다.", mapOf("quantity" to quantity.toPlainString()))
        }
        if (instrumentType == GameInstrumentType.STOCK && symbol.isNullOrBlank()) {
            throw ValidationException("개별 종목은 symbol이 필요합니다.", mapOf("instrumentType" to instrumentType.name))
        }
        validateSymbol(instrumentType, symbol)

        val session = activeSessionOrThrow(deviceId)
        if (requestId != null) {
            if (!Regex("^[A-Za-z0-9-]{1,64}$").matches(requestId)) throw ValidationException("요청 ID 형식이 올바르지 않습니다.", emptyMap())
            val previous = gameTransactionRepository.findBySessionIdAndRequestId(session.id!!, requestId)
            if (previous != null) {
                if (previous.instrumentType != instrumentType || previous.symbol != symbol || previous.action != action || previous.quantity.compareTo(quantity) != 0) throw com.firewatch.backend.web.ConflictException("동일 요청 ID에 다른 거래를 보낼 수 없습니다.")
                return buildTurnSnapshot(session)
            }
        }
        if (expectedTurnIndex != null && session.currentTurnIndex != expectedTurnIndex) throw com.firewatch.backend.web.ConflictException("연습 날짜가 변경되었습니다. 현재 턴을 확인해주세요.")
        session.simulationSeed?.let { seed -> simulationFor(session).blockedReason(seed, session.currentTurnIndex, instrumentType, symbol)?.let { throw ValidationException(it, emptyMap()) } }
        val turnDate = session.turnDates()[session.currentTurnIndex]
        val briefing = briefingFor(session, session.currentTurnIndex)
        val price = confirmedPrice(session, instrumentType, symbol, briefing, turnDate)
            ?: throw ValidationException(
                "이 턴에는 해당 자산의 가격 정보가 없습니다.",
                mapOf("instrumentType" to instrumentType.name, "symbol" to (symbol ?: "")),
            )
        if (expectedPrice != null && expectedPrice.compareTo(price) != 0) throw com.firewatch.backend.web.ConflictException("주문 미리보기 가격과 다릅니다. 금액을 다시 확인해주세요.")

        val key = GameHoldingKey(instrumentType, symbol)
        val ledger = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)
        when (action) {
            GameTradeAction.BUY -> {
                val cost = price.multiply(quantity)
                val cash = computeCash(session, ledger)
                if (cost > cash) {
                    throw ValidationException(
                        "현금이 부족합니다.",
                        mapOf("필요" to cost.toPlainString(), "보유" to cash.toPlainString()),
                    )
                }
            }
            GameTradeAction.SELL -> {
                val owned = computeHoldingQuantities(session, ledger)[key] ?: BigDecimal.ZERO
                // 공매도 허용 세션이면 보유량을 넘는 매도도 허용 — 결과적으로 보유 수량이 음수(공매도
                // 포지션)가 되고, 나중에 가격이 오르면 포트폴리오 가치가 그만큼 줄어드는 걸로 자연히
                // 반영된다(별도 롱/숏 분기 없이 기존 수량·현금 계산 로직을 그대로 재사용).
                if (!session.allowShortSelling && quantity > owned) {
                    throw ValidationException("보유 수량보다 많이 팔 수 없습니다.", mapOf("보유" to owned.toPlainString()))
                }
            }
        }

        val executed = gameTransactionRepository.save(
            GameTransaction(
                sessionId = session.id!!,
                turnIndex = session.currentTurnIndex,
                instrumentType = instrumentType,
                symbol = symbol,
                action = action,
                quantity = quantity,
                price = price,
                requestId = requestId,
            ),
        )
        return buildTurnSnapshot(session, ledger + executed)
    }

    // 2026-10-06 사용자 요청 — 덱(최대 43턴)을 끝까지 안 돌아도 중간에 그만둘 수 있어야 함.
    // nextTurn()의 "덱 소진" 분기와 동일하게 상태만 ENDED로 바꾸고, 지금 턴 인덱스는 그대로 둔다
    // (마지막으로 보던 턴 기준 최종 결과를 보여주기 위함).
    fun endGame(deviceId: String): GameTurnSnapshot {
        val session = activeSessionOrThrow(deviceId)
        session.status = GameSessionStatus.ENDED
        session.endedAt = Instant.now()
        gameSessionRepository.save(session)
        return buildTurnSnapshot(session)
    }

    fun nextTurn(deviceId: String, expectedTurnIndex: Int? = null): GameTurnSnapshot {
        val session = activeSessionOrThrow(deviceId)
        if (expectedTurnIndex != null && session.currentTurnIndex != expectedTurnIndex) throw com.firewatch.backend.web.ConflictException("이미 다음 날짜로 진행했습니다. 현재 턴을 확인해주세요.")
        val ledger = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)
        val totalTurns = session.turnDates().size
        if (session.currentTurnIndex + 1 >= totalTurns) {
            session.status = GameSessionStatus.ENDED
            session.endedAt = Instant.now()
        } else {
            val nextIndex = session.currentTurnIndex + 1
            val date = session.turnDates()[nextIndex]
            val briefing = briefingFor(session, nextIndex)
            val unavailable = computeHoldingQuantities(session, ledger).keys.filter { confirmedPrice(session, it.instrumentType, it.symbol, briefing, date, nextIndex) == null }
            if (unavailable.isNotEmpty()) throw ValidationException("다음 턴의 보유 자산 가격을 확인하지 못했습니다. 자산을 0원으로 처리하지 않고 현재 턴을 유지합니다. 재시도하거나 현재 턴에서 정리해주세요.", mapOf("unavailable" to unavailable.joinToString { it.symbol ?: it.instrumentType.name }))
            session.currentTurnIndex = nextIndex
        }
        gameSessionRepository.save(session)
        return buildTurnSnapshot(session, ledger)
    }

    private fun activeSessionOrThrow(deviceId: String): GameSession =
        gameSessionRepository.findByDeviceIdAndStatus(deviceId, GameSessionStatus.ACTIVE)
            ?.also { if (it.simulationSeed != null) simulationFor(it) }
            ?: throw NotFoundException("진행 중인 게임이 없습니다. 먼저 시작해주세요.")

    private fun simulationFor(session: GameSession): GameSimulation = GameSimulation.forVersion(session.simulationVersion)

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
        return dated.filter { it.first <= date && it.first >= date.minusDays(7) && it.second > BigDecimal.ZERO }.maxByOrNull { it.first }?.second
    }

    private fun validateSymbol(type: GameInstrumentType, symbol: String?) {
        if (type == GameInstrumentType.STOCK && (symbol == null || !Regex("^[A-Z0-9]{1,15}(\\.[A-Z0-9]{1,4})?$").matches(symbol))) throw ValidationException("확인된 종목 티커를 선택해주세요.", emptyMap())
    }

    private fun confirmedPrice(session: GameSession, type: GameInstrumentType, symbol: String?, briefing: Briefing, date: LocalDate, turnIndex: Int = session.currentTurnIndex): BigDecimal? {
        session.simulationSeed?.let { return simulationFor(session).price(it, turnIndex, type, symbol) }
        val key = "${session.id}:$turnIndex:${type.name}:${symbol ?: "-"}"
        val cached = priceSnapshots?.findById(key)?.orElse(null)
        if (cached != null) return cached.price
        val price = resolvePrice(type, symbol, briefing, date)?.takeIf { it > BigDecimal.ZERO } ?: return null
        priceSnapshots?.save(GamePriceSnapshot(key, price))
        return price
    }

    fun preview(deviceId: String, type: GameInstrumentType, symbol: String?, action: GameTradeAction, quantity: BigDecimal, expectedTurnIndex: Int?): GameOrderPreview {
        validateSymbol(type, symbol)
        if (quantity <= BigDecimal.ZERO || quantity.scale() > 4 || quantity > BigDecimal("1000000000")) throw ValidationException("수량 범위를 확인해주세요.", emptyMap())
        val session = activeSessionOrThrow(deviceId)
        if (expectedTurnIndex != null && session.currentTurnIndex != expectedTurnIndex) throw com.firewatch.backend.web.ConflictException("턴이 변경되었습니다. 다시 확인해주세요.")
        val date = session.turnDates()[session.currentTurnIndex]
        val briefing = briefingFor(session, session.currentTurnIndex)
        val price = confirmedPrice(session, type, symbol, briefing, date) ?: throw ValidationException("이 턴의 가격이 없어 거래할 수 없습니다. 거래정지 여부가 확인된 것은 아닙니다.", emptyMap())
        val total = price.multiply(quantity)
        val ledger = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)
        val cash = computeCash(session, ledger)
        val owned = computeHoldingQuantities(session, ledger)[GameHoldingKey(type, symbol)] ?: BigDecimal.ZERO
        val afterCash = if (action == GameTradeAction.BUY) cash - total else cash + total
        val afterOwned = if (action == GameTradeAction.BUY) owned + quantity else owned - quantity
        val reason = session.simulationSeed?.let { simulationFor(session).blockedReason(it, session.currentTurnIndex, type, symbol) }
            ?: if (action == GameTradeAction.BUY && afterCash < BigDecimal.ZERO) "현금이 부족합니다." else if (!session.allowShortSelling && afterOwned < BigDecimal.ZERO) "보유 수량보다 많이 팔 수 없습니다." else null
        return GameOrderPreview(session.currentTurnIndex, type, symbol, action, quantity, price, total, afterCash, afterOwned, reason == null, reason)
    }

    private fun computeHoldingQuantities(session: GameSession, txs: List<GameTransaction> = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)): Map<GameHoldingKey, BigDecimal> {
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
        return holdings.filterValues { it.compareTo(BigDecimal.ZERO) != 0 }
    }

    private fun computeCash(session: GameSession, txs: List<GameTransaction> = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)): BigDecimal {
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

    private fun briefingFor(session: GameSession, index: Int): Briefing {
        val date = session.turnDates()[index]
        return session.simulationSeed?.let { simulationFor(session).briefing(it, index, date) }
            ?: briefingRepository.findByBriefingDate(date) ?: throw ValidationException("턴 자료가 없습니다.", emptyMap())
    }

    private fun buildTurnSnapshot(session: GameSession, ledger: List<GameTransaction> = gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(session.id!!, session.currentTurnIndex)): GameTurnSnapshot {
        val turnDates = session.turnDates()
        val turnDate = turnDates[session.currentTurnIndex]
        val briefing = briefingFor(session, session.currentTurnIndex)
        val news = session.simulationSeed?.let { simulationFor(session).news(it, session.currentTurnIndex) } ?: newsArticleRepository.findByBriefingId(briefing.id!!)
        val cash = computeCash(session, ledger)
        val holdings = computeHoldingQuantities(session, ledger).map { (key, quantity) ->
            val price = confirmedPrice(session, key.instrumentType, key.symbol, briefing, turnDate)
            GameHolding(
                instrumentType = key.instrumentType,
                symbol = key.symbol,
                quantity = quantity,
                currentPrice = price,
                value = price?.multiply(quantity),
            )
        }
        val portfolioValue = if (holdings.any { it.value == null }) null else holdings.fold(cash) { acc, holding -> acc.add(holding.value!!) }
        val first = briefingFor(session, 0)
        val benchmark = if (first.kospi != null && briefing.kospi != null && first.kospi!! > BigDecimal.ZERO) PortfolioService.percent(briefing.kospi!! - first.kospi!!, first.kospi!!) else null
        val review = buildList {
            add(if (session.simulationSeed != null) "모든 뉴스·지표·가격·AI 픽은 가상입니다. 게임 속 픽은 시나리오 규칙으로 생성하며 실제 AI 투자 추천이 아닙니다." else "기존 과거 자료 게임 기록입니다. 새 게임은 완전 가상 시뮬레이션으로 시작합니다.")
            if (holdings.any { it.currentPrice == null }) add("일부 과거 시세가 없어 평가가 불완전합니다. 이 턴의 수익률은 확정 결과로 해석하지 마세요.")
            if (portfolioValue != null && portfolioValue > BigDecimal.ZERO && holdings.any { it.value != null && it.value.abs() > portfolioValue.abs() * BigDecimal("0.4") }) add("단일 자산이 평가금액의 40%를 넘습니다. 집중 투자 영향을 복기하세요.")
            if (cash > session.startingCash * BigDecimal("0.5")) add("현금 비중이 높습니다. 변동성 대응과 투자 기회를 함께 복기하세요.")
            if (holdings.any { it.quantity < BigDecimal.ZERO }) add("공매도 포지션은 가격 상승 때 손실이 확대될 수 있습니다.")
        }

        val contributions = if (session.currentTurnIndex == 0) emptyList() else {
            val previousIndex = session.currentTurnIndex - 1
            val previousBriefing = briefingFor(session, previousIndex)
            computeHoldingQuantities(session, ledger.filter { it.turnIndex <= previousIndex }).map { (key, qty) ->
                // Use carried positions, including stocks sold this turn and negative short quantities.
                // Same-turn orders exchange cash for holdings at the same price and add no turn P&L.
                val previous = session.simulationSeed?.let { simulationFor(session).price(it, previousIndex, key.instrumentType, key.symbol) }
                    ?: priceSnapshots?.findById("${session.id}:$previousIndex:${key.instrumentType.name}:${key.symbol ?: "-"}")?.orElse(null)?.price
                    ?: if (key.instrumentType != GameInstrumentType.STOCK) resolvePrice(key.instrumentType, key.symbol, previousBriefing, turnDates[previousIndex]) else null
                val current = confirmedPrice(session, key.instrumentType, key.symbol, briefing, turnDate)
                GameTurnContribution(key.instrumentType, key.symbol, (if (session.simulationSeed != null) simulationFor(session).assets.find { it.symbol == key.symbol }?.name else null) ?: (key.symbol ?: key.instrumentType.name), qty, previous, current,
                    if (previous != null && current != null) (current - previous) * qty else null,
                    session.simulationSeed?.let { simulationFor(session).moveReason(it, session.currentTurnIndex, key.instrumentType, key.symbol) } ?: "직전 턴 보유 수량 × 가격 변화입니다. 과거 가격 자료가 없으면 손익을 확정하지 않습니다.")
            }
        }
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
            portfolioValue = portfolioValue?.setScale(2, RoundingMode.HALF_UP),
            startingCash = session.startingCash,
            allowShortSelling = session.allowShortSelling,
            benchmarkReturnPercent = benchmark,
            review = review,
            simulation = session.simulationSeed != null,
            simulationVersion = if (session.simulationSeed != null) session.simulationVersion else null,
            marketEvents = session.simulationSeed?.let { simulationFor(session).events(it, session.currentTurnIndex) } ?: emptyList(),
            turnContributions = contributions,
            assetHistories = session.simulationSeed?.let { simulationFor(session).histories(it, session.currentTurnIndex) } ?: emptyList(),
            gamePicks = session.simulationSeed?.let { simulationFor(session).picks(it, session.currentTurnIndex) } ?: emptyList(),
            priceDrivers = session.simulationSeed?.let { seed -> simulationFor(session).histories(seed, 0).map { simulationFor(session).driver(seed, session.currentTurnIndex, it.instrumentType, it.symbol) } } ?: emptyList(),
            stockPrices = session.simulationSeed?.let { seed -> simulationFor(session).assets.associate { it.symbol to simulationFor(session).price(seed, session.currentTurnIndex, GameInstrumentType.STOCK, it.symbol)!! } } ?: emptyMap(),
            transactions = ledger.sortedWith(compareBy({ it.turnIndex }, { it.id })),
            // Fees are zero and this turn's execution/valuation price is fixed. Order cash
            // movements cancel position changes, so carried-position P&L is the total change.
            turnChange = if (session.currentTurnIndex > 0 && portfolioValue != null && contributions.all { it.profit != null })
                contributions.fold(BigDecimal.ZERO) { sum, contribution -> sum + contribution.profit!! } else null,
        )
    }

    // 난이도 = 시작 자금(2026-10-05 사용자 요청) — 금액은 서버가 고정, 클라이언트는 난이도 이름만 고른다.
    private fun startingCashFor(difficulty: GameDifficulty): BigDecimal = when (difficulty) {
        GameDifficulty.EASY -> BigDecimal("20000000")
        GameDifficulty.NORMAL -> BigDecimal("10000000")
        GameDifficulty.HARD -> BigDecimal("5000000")
    }
}

data class GameOrderPreview(val turnIndex: Int, val instrumentType: GameInstrumentType, val symbol: String?, val action: GameTradeAction, val quantity: BigDecimal, val unitPrice: BigDecimal, val total: BigDecimal, val cashAfter: BigDecimal, val quantityAfter: BigDecimal, val allowed: Boolean, val reason: String?) {
    override fun toString() = "주문 미리보기 $instrumentType $action (허용 $allowed)"
}
