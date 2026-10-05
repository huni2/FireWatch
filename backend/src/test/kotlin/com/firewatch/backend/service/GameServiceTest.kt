package com.firewatch.backend.service

import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.client.StockPricePoint
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameSession
import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.entity.GameTransaction
import com.firewatch.backend.entity.NewsArticle
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.GameSessionRepository
import com.firewatch.backend.repository.GameTransactionRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.ValidationException
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

// Design Ref: 가상투자 게임(2026-10-05) — 턴 진행·매매·잔고 검증을 순수 단위테스트로.
// 실제 Briefing 2건(day1=10/1, day2=10/2)만으로 "턴 덱 셔플 후 매수→다음턴→가격변동 반영→
// 보유 초과 매도 거부→덱 소진 시 종료"까지 한 번에 검증한다.
class GameServiceTest {

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
    }

    // GameSession.turnDates()가 셔플된 문자열을 파싱하는 구조라, 테스트에서는 순서를 day1→day2로
    // 고정하고 싶을 때 세션을 직접 만들어 저장소에 미리 심어둔다.
    private fun seedActiveSession(): GameSession {
        val session = GameSession(
            id = 1L,
            deviceId = "device-a",
            turnDatesRaw = "$day1,$day2",
            startingCash = BigDecimal("10000000"),
        )
        every { gameSessionRepository.findByDeviceIdAndStatus("device-a", GameSessionStatus.ACTIVE) } returns session
        every { gameSessionRepository.save(any()) } answers { firstArg() }
        return session
    }

    @Test
    fun `게임을 시작하면 쌓인 브리핑 날짜로 덱을 만들고 첫 턴을 돌려준다`() {
        stubRepositories(turnDates = "")

        val turn = service.startGame("device-a")

        assertEquals(2, turn.totalTurns)
        assertEquals(0, turn.turnIndex)
        assertEquals(GameSessionStatus.ACTIVE, turn.status)
        assertEquals(BigDecimal("10000000.00"), turn.portfolioValue)
    }

    @Test
    fun `이미 활성 세션이 있으면 그대로 돌려준다(멱등)`() {
        stubRepositories(turnDates = "")
        service.startGame("device-a")

        val second = service.startGame("device-a")

        assertEquals(2, second.totalTurns)
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
}
