package com.firewatch.backend.service

import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.client.StockPricePoint
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.GameDifficulty
import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameSession
import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.entity.GameTransaction
import com.firewatch.backend.entity.GamePriceSnapshot
import com.firewatch.backend.repository.GamePriceSnapshotRepository
import com.firewatch.backend.entity.NewsArticle
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.GameSessionRepository
import com.firewatch.backend.repository.GameTransactionRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.ValidationException
import com.firewatch.backend.web.dto.toResponse
import io.mockk.every
import io.mockk.clearMocks
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

// Design Ref: 가상투자 게임(2026-10-05) — 턴 진행·매매·잔고 검증을 순수 단위테스트로.
// 실제 Briefing 2건(day1=10/1, day2=10/2)만으로 "턴 덱 셔플 후 매수→다음턴→가격변동 반영→
// 보유 초과 매도 거부→덱 소진 시 종료"까지 한 번에 검증한다.
class GameServiceTest {
    private val simulation = GameSimulation.forVersion(GameSimulation.CURRENT_VERSION)
    private fun virtualSession(seed: Long, short: Boolean = false, version: Int = GameSimulation.CURRENT_VERSION): GameSession {
        stubRepositories("")
        val session = GameSession(id = 1L, deviceId = "device-a", turnDatesRaw = simulation.dates(seed).joinToString(","), startingCash = BigDecimal("10000000"), allowShortSelling = short, simulationSeed = seed, simulationVersion = version)
        every { gameSessionRepository.findByDeviceIdAndStatus("device-a", GameSessionStatus.ACTIVE) } returns session
        every { gameSessionRepository.save(any()) } answers { firstArg() }
        return session
    }

    @Test
    fun `미지원 규칙은 기록을 바꾸거나 가격을 현재 버전으로 대체하지 않는다`() {
        val session = virtualSession(42L, version = 999)
        every { gameSessionRepository.findByIdAndDeviceId(1L, "device-a") } returns session
        assertFailsWith<ValidationException> { service.startGame("device-a", GameDifficulty.NORMAL, false) }
        assertFailsWith<ValidationException> { service.getCurrentTurn("device-a") }
        assertFailsWith<ValidationException> { service.nextTurn("device-a") }
        assertFailsWith<ValidationException> { service.endGame("device-a") }
        assertFailsWith<ValidationException> { service.trade("device-a", GameInstrumentType.STOCK, "005930.KS", GameTradeAction.BUY, BigDecimal.ONE) }
        assertFailsWith<ValidationException> { service.preview("device-a", GameInstrumentType.STOCK, "005930.KS", GameTradeAction.BUY, BigDecimal.ONE, null) }
        assertFailsWith<ValidationException> { service.getRankingSnapshot("device-a", 1L) }
        assertEquals(GameSessionStatus.ACTIVE, session.status)
        assertEquals(0, session.currentTurnIndex)
        assertEquals(null, session.endedAt)
        verify(exactly = 0) { gameSessionRepository.save(any()) }
        verify(exactly = 0) { gameTransactionRepository.save(any()) }
        verify(exactly = 0) { stockService.fetchPriceHistory(any(), any()) }
    }

    @Test
    fun `현재 게임은 저장 규칙으로 재조회하고 같은 기업 목록을 반환한다`() {
        virtualSession(42L)
        val turn = service.getCurrentTurn("device-a")
        assertEquals(2, turn.simulationVersion)
        assertEquals(2, turn.toResponse().simulationVersion)
        assertEquals(simulation.picks(42L, 0), turn.gamePicks)
        assertEquals(turn.stockPrices, service.getCurrentTurn("device-a").stockPrices)
    }

    @Test
    fun `출시 전 시험 게임은 기록을 보관하고 단일 새 게임으로 시작한다`() {
        val previous = virtualSession(42L, version = 1)
        every { gameSessionRepository.saveAndFlush(any()) } answers { firstArg() }
        every { gameSessionRepository.save(any()) } answers { firstArg<GameSession>().apply { id = 2L } }
        assertFailsWith<NotFoundException> { service.getCurrentTurn("device-a") }
        val current = service.startGame("device-a", GameDifficulty.NORMAL, false)
        assertEquals(GameSessionStatus.ENDED, previous.status)
        assertTrue(previous.endedAt != null)
        assertEquals(1, previous.simulationVersion)
        assertEquals(42L, previous.simulationSeed)
        assertEquals(2L, current.sessionId)
        assertEquals(26, current.gameAssets.size)
        verify(exactly = 0) { gameTransactionRepository.save(any()) }
    }

    @Test
    fun `버전2의 픽과 임의 기업을 직접 매수하고 최대 턴 응답 크기를 확인한다`() {
        val session = virtualSession(42L, version = 2)
        val initial = service.getCurrentTurn("device-a")
        assertEquals(26, initial.gameAssets.size)
        for (symbol in (initial.gamePicks.map { it.symbol } + "035720.KS").distinct()) {
            val bought = service.trade("device-a", GameInstrumentType.STOCK, symbol, GameTradeAction.BUY, BigDecimal.ONE)
            assertTrue(bought.holdings.any { it.symbol == symbol && it.currentPrice != null })
        }
        val next = service.nextTurn("device-a", 0)
        assertTrue(next.portfolioValue!! > BigDecimal.ZERO)
        session.currentTurnIndex = 23
        val end = service.getCurrentTurn("device-a")
        val json = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build().writeValueAsBytes(end.toResponse())
        assertTrue(json.size < 100000)
        println("26-company maximum turn JSON=${json.size} bytes; includes all34 histories and current test ledger")
        java.io.File("build/test-fixtures").mkdirs()
        java.io.File("build/test-fixtures/game-v2-turn.json").writeBytes(json)
        verify(exactly = 0) { stockService.fetchPriceHistory(any(), any()) }
    }

    @Test
    fun `거래정지는 평가 가격을 유지하고 주문을 막으며 다음 턴 재개된다`() {
        val seed = (0L..1000L).first { simulation.events(it, 1).any { e -> e.code == "TRADING_HALT" } && simulation.events(it, 2).isEmpty() }
        virtualSession(seed)
        val symbol = simulation.events(seed, 1).single().blockedAssets.single().substringAfter(":")
        val bought = service.trade("device-a", GameInstrumentType.STOCK, symbol, GameTradeAction.BUY, BigDecimal.TEN)
        val halted = service.nextTurn("device-a", 0)
        assertEquals(bought.holdings.single().currentPrice, halted.holdings.single().currentPrice)
        assertEquals(0, halted.turnContributions.single().profit!!.compareTo(BigDecimal.ZERO))
        assertTrue(halted.holdings.single().value!! > BigDecimal.ZERO)
        assertTrue(!service.preview("device-a", GameInstrumentType.STOCK, symbol, GameTradeAction.SELL, BigDecimal.ONE, 1).allowed)
        assertFailsWith<ValidationException> { service.trade("device-a", GameInstrumentType.STOCK, symbol, GameTradeAction.SELL, BigDecimal.ONE) }
        val resumed = service.nextTurn("device-a", 1)
        assertTrue(resumed.marketEvents.isEmpty())
        assertTrue(service.preview("device-a", GameInstrumentType.STOCK, symbol, GameTradeAction.SELL, BigDecimal.ONE, 2).allowed)
        assertEquals(resumed.stockPrices, service.getCurrentTurn("device-a").stockPrices)
    }

    @Test
    fun `사이드카는 지수 주문만 막고 현물과 다음 턴 진행을 허용한다`() {
        val seed = (0L..1000L).first { simulation.events(it, 1).any { e -> e.code == "SIDECAR" } && simulation.events(it, 2).isEmpty() }
        virtualSession(seed)
        service.trade("device-a", GameInstrumentType.KOSPI, null, GameTradeAction.BUY, BigDecimal.ONE)
        val paused = service.nextTurn("device-a", 0)
        assertEquals("SIDECAR", paused.marketEvents.single().code)
        assertFailsWith<ValidationException> { service.trade("device-a", GameInstrumentType.KOSPI, null, GameTradeAction.BUY, BigDecimal.ONE) }
        service.trade("device-a", GameInstrumentType.STOCK, "005930.KS", GameTradeAction.BUY, BigDecimal.ONE)
        service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal.ONE)
        service.nextTurn("device-a", 1)
        assertTrue(service.preview("device-a", GameInstrumentType.KOSPI, null, GameTradeAction.BUY, BigDecimal.ONE, 2).allowed)
    }

    @Test
    fun `손익 기여는 공매도와 이번 턴 전량 매도 후에도 직전 수량으로 계산한다`() {
        val seed = (0L..1000L).first { simulation.events(it, 1).isEmpty() }
        virtualSession(seed, true)
        service.trade("device-a", GameInstrumentType.STOCK, "005930.KS", GameTradeAction.BUY, BigDecimal("1.0000"))
        service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.SELL, BigDecimal.TEN)
        val next = service.nextTurn("device-a", 0)
        val sold = service.trade("device-a", GameInstrumentType.STOCK, "005930.KS", GameTradeAction.SELL, BigDecimal.ONE)
        assertTrue(sold.holdings.none { it.symbol == "005930.KS" })
        assertEquals(next.turnContributions, sold.turnContributions)
        val profit = sold.turnContributions.fold(BigDecimal.ZERO) { sum, c -> sum + c.profit!! }
        assertEquals(0, profit.compareTo(sold.turnChange))
        val short = sold.turnContributions.first { it.instrumentType == GameInstrumentType.GOLD }
        assertEquals(0, short.profit!!.compareTo((short.currentPrice!! - short.previousPrice!!) * BigDecimal("-10")))
    }

    private val day1 = LocalDate.of(2026, 10, 1)
    private val day2 = LocalDate.of(2026, 10, 2)

    private fun briefing(date: LocalDate, id: Long, goldPrice: BigDecimal) = Briefing(
        briefingDate = date,
        marketSummary = "요약",
        goldPrice = goldPrice,
        dataSourceStatus = DataSourceStatus.NORMAL,
    ).apply { this.id = id }

    private val briefing1 = briefing(day1, 1L, BigDecimal("2000"))
    private val briefing2 = briefing(day2, 2L, BigDecimal("2100"))

    private val briefingRepository = mockk<BriefingRepository>()
    private val newsArticleRepository = mockk<NewsArticleRepository>(relaxed = true)
    private val gameSessionRepository = mockk<GameSessionRepository>()
    private val gameTransactionRepository = mockk<GameTransactionRepository>()
    private val stockService = mockk<StockService>()

    private val service = GameService(
        briefingRepository,
        newsArticleRepository,
        gameSessionRepository,
        gameTransactionRepository,
        stockService,
    )

    private val transactions = mutableListOf<GameTransaction>()

    private fun stubRepositories(turnDates: String) {
        every { briefingRepository.findAll() } returns listOf(briefing1, briefing2)
        every { briefingRepository.findByBriefingDate(day1) } returns briefing1
        every { briefingRepository.findByBriefingDate(day2) } returns briefing2
        every { newsArticleRepository.findByBriefingId(any()) } returns emptyList<NewsArticle>()

        val sessionSlot = slot<GameSession>()
        var saved: GameSession? = null
        every { gameSessionRepository.findByDeviceIdAndStatus("device-a", GameSessionStatus.ACTIVE) } answers {
            saved?.takeIf { it.status == GameSessionStatus.ACTIVE }
        }
        every { gameSessionRepository.save(capture(sessionSlot)) } answers {
            val session = sessionSlot.captured
            if (session.id == null) session.id = 1L
            saved = session
            session
        }
        // 셔플 결과를 고정하기 위해 startGame 호출 전에 턴 덱을 미리 넣어둔다(아래 startFixedSession 참고).

        every { gameTransactionRepository.save(any()) } answers {
            val tx = firstArg<GameTransaction>()
            if (tx.id == null) tx.id = (transactions.size + 1).toLong()
            transactions.add(tx)
            tx
        }
        every { gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(any(), any()) } answers {
            val turnIndex = secondArg<Int>()
            transactions.filter { it.turnIndex <= turnIndex }
        }
        every { gameTransactionRepository.findBySessionIdAndRequestId(any(), any()) } answers {
            val requestId = secondArg<String>()
            transactions.find { it.requestId == requestId }
        }
    }

    // GameSession.turnDates()가 셔플된 문자열을 파싱하는 구조라, 테스트에서는 순서를 day1→day2로
    // 고정하고 싶을 때 세션을 직접 만들어 저장소에 미리 심어둔다.
    private fun seedActiveSession(allowShortSelling: Boolean = false): GameSession {
        val session = GameSession(
            id = 1L,
            deviceId = "device-a",
            turnDatesRaw = "$day1,$day2",
            startingCash = BigDecimal("10000000"),
            allowShortSelling = allowShortSelling,
        )
        every { gameSessionRepository.findByDeviceIdAndStatus("device-a", GameSessionStatus.ACTIVE) } returns session
        every { gameSessionRepository.save(any()) } answers { firstArg() }
        return session
    }

    @Test
    fun `외부 자료 없이 가상 게임을 시작하고 첫 턴을 돌려준다`() {
        stubRepositories(turnDates = "")

        val turn = service.startGame("device-a", GameDifficulty.NORMAL, false)

        assertEquals(24, turn.totalTurns)
        assertEquals(0, turn.turnIndex)
        assertEquals(2030, turn.turnDate.year)
        assertTrue(turn.simulation)
        assertEquals(2, turn.simulationVersion)
        assertEquals(26, turn.gameAssets.size)
        assertEquals(GameSessionStatus.ACTIVE, turn.status)
        assertEquals(BigDecimal("10000000.00"), turn.portfolioValue)
    }

    @Test
    fun `이미 활성 세션이 있으면 난이도·공매도 설정을 무시하고 그대로 돌려준다(멱등)`() {
        stubRepositories(turnDates = "")
        service.startGame("device-a", GameDifficulty.NORMAL, false)

        val second = service.startGame("device-a", GameDifficulty.HARD, true)

        assertEquals(24, second.totalTurns)
        assertEquals(BigDecimal("10000000.00"), second.portfolioValue) // HARD(500만)로 안 바뀜
    }

    @Test
    fun `난이도에 따라 시작 자금이 달라진다`() {
        stubRepositories(turnDates = "")

        val easy = service.startGame("device-a", GameDifficulty.EASY, false)
        assertEquals(BigDecimal("20000000"), easy.startingCash)
    }

    @Test
    fun `공매도를 허용한 세션은 보유 수량보다 많이 팔 수 있고 포지션이 음수가 된다`() {
        stubRepositories(turnDates = "")
        seedActiveSession(allowShortSelling = true)

        val turn = service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.SELL, BigDecimal("3"))

        assertEquals(BigDecimal("-3"), turn.holdings.single().quantity)
        assertEquals(BigDecimal("10006000"), turn.cash) // 10,000,000 + 2000*3(공매도로 받은 현금)
    }

    @Test
    fun `매수하면 현금이 줄고 보유 수량이 늘며 포트폴리오 가치는 그대로다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()

        val turn = service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal("10"))

        assertEquals(1, turn.holdings.size)
        assertEquals(BigDecimal("10"), turn.holdings[0].quantity)
        assertEquals(BigDecimal("9980000"), turn.cash) // 10,000,000 - 2000*10
        assertEquals(BigDecimal("10000000.00"), turn.portfolioValue) // 현금 감소분 = 보유 가치
    }

    @Test
    fun `현금보다 비싼 매수는 거부된다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()

        assertFailsWith<ValidationException> {
            service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal("10000"))
        }
    }

    @Test
    fun `보유 수량보다 많이 팔 수 없다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()
        service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal("5"))

        assertFailsWith<ValidationException> {
            service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.SELL, BigDecimal("10"))
        }
    }

    @Test
    fun `다음 턴으로 넘어가면 지표가 바뀐 가격으로 포트폴리오 가치를 재계산한다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()
        service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal("10"))

        val turn = service.nextTurn("device-a")

        assertEquals(1, turn.turnIndex)
        assertEquals(day2, turn.turnDate)
        // 현금 9,980,000 + 금 10개 * 2100(10/2 가격) = 10,001,000
        assertEquals(BigDecimal("10001000.00"), turn.portfolioValue)
    }

    @Test
    fun `마지막 턴에서 다음 턴을 누르면 게임이 종료된다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()

        service.nextTurn("device-a") // turnIndex 0 -> 1 (마지막)
        val ended = service.nextTurn("device-a") // 덱 소진

        assertEquals(GameSessionStatus.ENDED, ended.status)
    }

    @Test
    fun `덱을 다 안 돌아도 그만두기를 누르면 그 턴 기준으로 게임이 종료된다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()
        service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal("5"))

        val ended = service.endGame("device-a")

        assertEquals(GameSessionStatus.ENDED, ended.status)
        assertEquals(0, ended.turnIndex) // 다음 턴으로 넘기지 않고 지금 턴 그대로 종료
        assertEquals(1, ended.holdings.size) // 매수했던 보유분이 결과에 그대로 반영
    }

    @Test
    fun `진행 중인 게임이 없으면 거래 시 NotFoundException`() {
        every { gameSessionRepository.findByDeviceIdAndStatus("device-a", GameSessionStatus.ACTIVE) } returns null

        assertFailsWith<NotFoundException> {
            service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal.ONE)
        }
    }

    @Test
    fun `개별 종목은 그 턴의 실제 날짜에 가장 가까운 과거 종가로 거래된다`() {
        stubRepositories(turnDates = "")
        seedActiveSession()
        every { stockService.fetchPriceHistory("AAPL", StockRange.SIX_MONTH) } returns StockPriceHistory(
            symbol = "AAPL",
            points = listOf(
                StockPricePoint(timestamp = "2026-09-30T00:00:00Z", close = BigDecimal("100")),
                StockPricePoint(timestamp = "2026-10-01T00:00:00Z", close = BigDecimal("110")),
                StockPricePoint(timestamp = "2026-10-05T00:00:00Z", close = BigDecimal("999")), // 미래 턴 날짜 — 무시돼야 함
            ),
        )

        val turn = service.trade("device-a", GameInstrumentType.STOCK, "AAPL", GameTradeAction.BUY, BigDecimal("1"))

        assertEquals(BigDecimal("9999890"), turn.cash) // 10,000,000 - 110
        assertTrue(turn.holdings.any { it.symbol == "AAPL" && it.currentPrice == BigDecimal("110") })
    }

    @Test
    fun `미래 가격만 있는 종목은 거래할 수 없다`() {
        stubRepositories("")
        seedActiveSession()
        every { stockService.fetchPriceHistory("AAPL", StockRange.SIX_MONTH) } returns StockPriceHistory(
            symbol = "AAPL", points = listOf(StockPricePoint("2026-10-05T00:00:00Z", BigDecimal("999"))),
        )
        assertFailsWith<ValidationException> {
            service.trade("device-a", GameInstrumentType.STOCK, "AAPL", GameTradeAction.BUY, BigDecimal.ONE)
        }
        assertTrue(transactions.isEmpty())
    }

    @Test
    fun `거래 재전송은 한 번만 반영하고 이전 턴 요청은 거부한다`() {
        stubRepositories("")
        seedActiveSession()
        repeat(2) {
            service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal.ONE, "request-1", 0)
        }
        assertEquals(1, transactions.size)
        service.nextTurn("device-a", 0)
        assertFailsWith<com.firewatch.backend.web.ConflictException> { service.nextTurn("device-a", 0) }
    }

    @Test
    fun `가격 누락은 영원이 아니라 미확정 평가로 반환하고 턴 이동을 막는다`() {
        stubRepositories("")
        val session = seedActiveSession()
        service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal.ONE)
        every { briefingRepository.findByBriefingDate(day2) } returns briefing(day2, 2L, BigDecimal.ZERO)
        assertFailsWith<ValidationException> { service.nextTurn("device-a", 0) }
        assertEquals(0, session.currentTurnIndex)
        every { briefingRepository.findByBriefingDate(day1) } returns briefing(day1, 1L, BigDecimal.ZERO)
        val view = service.getCurrentTurn("device-a")
        assertEquals(null, view.toResponse().simulationVersion)
        assertEquals(null, view.holdings.single().value)
        assertEquals(null, view.portfolioValue)
        assertEquals(BigDecimal("9998000"), view.cash)
    }

    @Test
    fun `주문 총액과 잔액 미리보기 및 가격 불일치를 검증한다`() {
        stubRepositories("")
        seedActiveSession()
        val preview = service.preview("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal.TEN, 0)
        assertEquals(BigDecimal("20000"), preview.total)
        assertEquals(BigDecimal("9980000"), preview.cashAfter)
        assertTrue(preview.allowed)
        assertTrue(transactions.isEmpty())
        assertFailsWith<com.firewatch.backend.web.ConflictException> {
            service.trade("device-a", GameInstrumentType.GOLD, null, GameTradeAction.BUY, BigDecimal.TEN, null, 0, BigDecimal("1999"))
        }
        assertTrue(transactions.isEmpty())
    }

    @Test
    fun `확정 가격을 저장해 외부 조회 실패 후에도 체결과 보유 평가를 유지한다`() {
        stubRepositories("")
        seedActiveSession()
        val repository = mockk<GamePriceSnapshotRepository>()
        val prices = mutableMapOf<String, GamePriceSnapshot>()
        every { repository.findById(any()) } answers { Optional.ofNullable(prices[firstArg<String>()]) }
        every { repository.save(any()) } answers { firstArg<GamePriceSnapshot>().also { prices[it.id] = it } }
        val cached = GameService(briefingRepository, newsArticleRepository, gameSessionRepository, gameTransactionRepository, stockService, repository)
        every { stockService.fetchPriceHistory("AAPL", StockRange.SIX_MONTH) } returns StockPriceHistory("AAPL", listOf(StockPricePoint("2026-10-01T00:00:00Z", BigDecimal("110"))))
        val preview = cached.preview("device-a", GameInstrumentType.STOCK, "AAPL", GameTradeAction.BUY, BigDecimal.TEN, 0)
        every { stockService.fetchPriceHistory("AAPL", StockRange.SIX_MONTH) } throws IllegalStateException("provider down")
        val bought = cached.trade("device-a", GameInstrumentType.STOCK, "AAPL", GameTradeAction.BUY, BigDecimal.TEN, "cached-order", 0, preview.unitPrice)
        assertEquals(BigDecimal("1100"), bought.holdings.single().value)
        assertEquals(BigDecimal("10000000.00"), cached.getCurrentTurn("device-a").portfolioValue)
        assertFailsWith<ValidationException> { cached.nextTurn("device-a", 0) }
        assertEquals(0, cached.getCurrentTurn("device-a").turnIndex)
        assertEquals(BigDecimal.TEN, cached.getCurrentTurn("device-a").holdings.single().quantity)
        every { stockService.fetchPriceHistory("AAPL", StockRange.SIX_MONTH) } returns StockPriceHistory("AAPL", listOf(StockPricePoint("2026-10-02T00:00:00Z", BigDecimal("120"))))
        val next = cached.nextTurn("device-a", 0)
        assertEquals(BigDecimal("100"), next.turnChange)
        assertEquals(BigDecimal("10000100.00"), next.portfolioValue)
        assertEquals(1, transactions.size)
    }

    @Test
    fun `가상 게임 거래와 다음 턴은 외부 시세와 브리핑 조회를 호출하지 않는다`() {
        stubRepositories("")
        val started = service.startGame("device-a", GameDifficulty.NORMAL, false)
        val symbol = started.gamePicks.first().symbol
        val price = started.stockPrices.getValue(symbol)
        val bought = service.trade("device-a", GameInstrumentType.STOCK, symbol, GameTradeAction.BUY, BigDecimal.TEN, "virtual-order", 0, price)
        assertEquals(BigDecimal("10000000.00"), bought.portfolioValue)
        clearMocks(gameTransactionRepository, answers = false)
        val next = service.nextTurn("device-a", 0)
        verify(exactly = 1) { gameTransactionRepository.findBySessionIdAndTurnIndexLessThanEqual(any(), any()) }
        assertEquals(BigDecimal.TEN, next.holdings.single().quantity)
        assertTrue(next.portfolioValue!! > BigDecimal.ZERO)
        assertTrue(next.news.all { it.link.isEmpty() && it.title.startsWith("[가상 뉴스]") })
        assertEquals(next.stockPrices, service.getCurrentTurn("device-a").stockPrices)
        assertTrue(next.briefing.recommendedStocksRaw!!.isNotBlank())
        verify(exactly = 0) { stockService.fetchPriceHistory(any(), any()) }
        verify(exactly = 0) { briefingRepository.findByBriefingDate(any()) }
    }
}
