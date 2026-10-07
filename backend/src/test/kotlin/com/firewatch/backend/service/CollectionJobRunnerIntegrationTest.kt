package com.firewatch.backend.service

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.support.TransactionTemplate
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.entity.UserSettings

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:collection-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.market.collection-cron=-"])
class CollectionJobRunnerIntegrationTest {
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var transaction: TransactionTemplate
    @Autowired lateinit var runner: CollectionJobRunner
    @Autowired lateinit var observations: MarketObservationStore
    @Autowired lateinit var settings: UserSettingsRepository
    @Autowired lateinit var portfolios: com.firewatch.backend.repository.PortfolioRepository
    @Autowired lateinit var quotes: com.firewatch.backend.repository.MarketQuoteRepository
    @Autowired lateinit var feed: com.firewatch.backend.repository.NewsFeedRepository
    @Autowired lateinit var runs: com.firewatch.backend.repository.CollectionRunRepository
    @Autowired lateinit var recommendations: com.firewatch.backend.repository.RecommendedStockSnapshotRepository
    private val now = Instant.parse("2026-10-07T00:00:00Z")

    @BeforeEach fun clear() {
        listOf("collection_jobs", "collection_circuits", "collection_alerts", "collection_operator", "market_observations").forEach { jdbc.update("DELETE FROM $it") }
        jdbc.update("DELETE FROM audit_logs WHERE action_name LIKE 'collection.%'")
        quotes.deleteAll()
        feed.deleteAll()
        runs.deleteAll()
        settings.deleteAll()
    }

    @Test fun `실패는 세 번까지만 수행하고 재시작 및 새 종목으로도 중지 한도를 우회할 수 없다`() {
        var calls = 0
        fun attempt(at: Instant, key: String = "stock:2026-10-07:ABC", service: CollectionJobRunner = runner) = service.run(key, at,
            fetch = { calls++; error("provider URL contains secret-key") }, persist = { _: Unit -> CollectionWrite(0) })
        assertEquals(CollectionOutcome.FAILED, attempt(now))
        assertEquals(CollectionOutcome.SKIPPED, attempt(now.plusSeconds(1), "stock:2026-10-07:XYZ"))
        assertEquals(CollectionOutcome.FAILED, attempt(now.plusSeconds(1800)))
        assertEquals(CollectionOutcome.SKIPPED, attempt(now.plusSeconds(1801)))
        assertEquals(CollectionOutcome.FAILED, attempt(now.plusSeconds(5400)))
        val restarted = CollectionJobRunner(jdbc, transaction)
        assertEquals(CollectionOutcome.PAUSED, attempt(now.plusSeconds(10000), "stock:2026-10-07:NEW", restarted))
        assertEquals(3, calls)
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE status='FAILURE' AND action_name='collection.stock'", Int::class.java))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM collection_alerts", Int::class.java))
        assertEquals(true, jdbc.queryForObject("SELECT paused FROM collection_alerts", Boolean::class.java))
        assertFalse(jdbc.queryForObject("SELECT response_summary FROM audit_logs WHERE action_name='collection.stock' LIMIT 1", String::class.java)!!.contains("secret-key"))
        assertEquals(CollectionOutcome.FAILED, attempt(now.plus(Duration.ofDays(1)), "stock:2026-10-08:ABC", restarted))
        assertEquals(4, calls)
    }

    @Test fun `저장 실패는 신규 데이터와 성공 상태를 함께 롤백하고 이전 정상 값은 유지한다`() {
        observations.save("KOSPI", BigDecimal("2700"), "POINT", "TEST", null, now.minusSeconds(100), "old")
        assertEquals(CollectionOutcome.FAILED, runner.run("financial:2026-10-07-morning", now, fetch = { 1 }, persist = {
            observations.save("KOSPI", BigDecimal("2800"), "POINT", "TEST", null, now, "new")
            error("database write failed")
        }))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM market_observations", Int::class.java))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_jobs WHERE status='SUCCESS'", Int::class.java))
    }

    @Test fun `재시도 성공은 알림을 해소하고 동일 관측값을 중복 저장하지 않는다`() {
        runner.run("news:2026-10-07", now, fetch = { error("offline") }, persist = { _: Unit -> CollectionWrite(0) })
        assertEquals(CollectionOutcome.SUCCESS, runner.run("news:2026-10-07", now.plusSeconds(1800), Duration.ofMinutes(30), fetch = { 1 }, persist = {
            CollectionWrite(observations.save("ABC", BigDecimal("50"), "NATIVE_PRICE", "TEST", now, now, "point"))
        }))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_alerts WHERE resolved_at IS NULL", Int::class.java))
        assertEquals(0, observations.save("ABC", BigDecimal("70"), "NATIVE_PRICE", "TEST", now, now.plusSeconds(2000), "point"))
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM market_observations WHERE price=70", Int::class.java))
    }

    @Test fun `일부 성공은 이력을 남기되 실패로 감사 기록되고 제한 횟수 후 중지된다`() {
        listOf(0L, 1800L, 5400L).forEach { seconds ->
            assertEquals(CollectionOutcome.PARTIAL, runner.run("financial:2026-10-07-morning", now.plusSeconds(seconds), fetch = { 1 }, persist = {
                CollectionWrite(observations.save("GOLD", BigDecimal("2500"), "USD/oz", "TEST", null, now, "morning"), partial = true)
            }))
        }
        assertEquals(CollectionOutcome.PAUSED, runner.run("financial:2026-10-07-close", now.plusSeconds(10000), fetch = { error("must not run") }, persist = { _: Unit -> CollectionWrite(0) }))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM market_observations", Int::class.java))
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE status='FAILURE' AND action_name='collection.financial'", Int::class.java))
    }

    @Test fun `누락 지표 목록이 길어도 성공값을 저장하고 안전한 장애 코드만 남긴다`() {
        val missing = listOf("USD_KRW", "JPY100_KRW", "CNY_KRW", "KOSPI", "KOSDAQ", "SP500", "NASDAQ", "DOW", "US_BOND_10Y", "KR_BOND_10Y", "https://secret-key")
        assertEquals(CollectionOutcome.PARTIAL, runner.run("financial:2026-10-07-morning", now, fetch = { 1 }, persist = {
            CollectionWrite(observations.save("GOLD", BigDecimal("2500"), "USD/oz", "TEST", null, now, "morning"), true, missing)
        }))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM market_observations", Int::class.java))
        val code = jdbc.queryForObject("SELECT error_code FROM collection_jobs", String::class.java)!!
        assertTrue(code.startsWith("INCOMPLETE_DATA:USD_KRW"))
        assertTrue(code.length <= 80)
        val summary = jdbc.queryForObject("SELECT response_summary FROM audit_logs WHERE action_name='collection.financial'", String::class.java)!!
        assertTrue(summary.contains("US_BOND_10Y"))
        assertFalse(summary.contains("secret-key"))
    }

    @Test fun `장애 푸시는 지정한 운영자만 한 번 받고 브리핑 발송 시각을 변경하지 않는다`() {
        val operator = settings.save(UserSettings(deviceId = "operator-push-test", fcmTokensRaw = "operator-token"))
        settings.save(UserSettings(deviceId = "regular-push-test", fcmTokensRaw = "regular-token"))
        jdbc.update("INSERT INTO collection_operator (id, settings_id) VALUES (1, ?)", operator.id)
        runner.run("news:2026-10-07", now, fetch = { error("offline") }, persist = { _: Unit -> CollectionWrite(0) })
        val sender = mockk<PushService>()
        every { sender.notifyOperator(any(), any()) } returns PushSendResult(1, 1, 1)
        val outbox = OperationsPushService(jdbc, settings, sender)
        outbox.flush(now)
        outbox.flush(now.plusSeconds(7200))
        verify(exactly = 1) { sender.notifyOperator(match { it.id == operator.id }, any()) }
        assertEquals(null, settings.findById(operator.id).get().lastNotifiedDate)
    }

    @Test fun `운영자 푸시 실패도 한 시간 간격 세 번으로 제한된다`() {
        val operator = settings.save(UserSettings(deviceId = "operator-failure-test", fcmTokensRaw = "operator-token"))
        jdbc.update("INSERT INTO collection_operator (id, settings_id) VALUES (1, ?)", operator.id)
        runner.run("news:2026-10-07", now, fetch = { error("offline") }, persist = { _: Unit -> CollectionWrite(0) })
        val sender = mockk<PushService>()
        every { sender.notifyOperator(any(), any()) } throws IllegalStateException("push failed")
        val outbox = OperationsPushService(jdbc, settings, sender)
        listOf(0L, 1L, 3599L, 3600L, 7200L, 10800L).forEach { outbox.flush(now.plusSeconds(it)) }
        verify(exactly = 3) { sender.notifyOperator(any(), any()) }
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE action_name='collection.operatorPush' AND status='FAILURE'", Int::class.java))
    }

    @Test fun `제공처 429 응답은 재시도 없이 해당 날짜 수집을 중지한다`() {
        val limited = org.springframework.web.reactive.function.client.WebClientResponseException.create(429, "Too Many Requests", org.springframework.http.HttpHeaders.EMPTY, byteArrayOf(), null)
        runner.run("stock:2026-10-07:ABC", now, fetch = { throw limited }, persist = { _: Unit -> CollectionWrite(0) })
        assertEquals(CollectionOutcome.PAUSED, runner.run("stock:2026-10-07:XYZ", now.plusSeconds(10000), fetch = { error("must not run") }, persist = { _: Unit -> CollectionWrite(0) }))
        assertEquals(true, jdbc.queryForObject("SELECT paused FROM collection_alerts", Boolean::class.java))
    }

    @Test fun `수집 완료 후 추가한 관심 종목도 수집하고 한 실행의 종목 요청은 열 건을 넘지 않는다`() {
        val owner = settings.save(UserSettings(deviceId = "watch-test", watchedStocksRaw = "AAA"))
        val stocks = mockk<StockService>()
        every { stocks.fetchPriceHistory(any(), any()) } answers {
            com.firewatch.backend.client.StockPriceHistory(firstArg(), listOf(com.firewatch.backend.client.StockPricePoint(now.minusSeconds(100).toString(), BigDecimal("100"))))
        }
        val news = mockk<NewsService>()
        every { news.fetchRelatedNews() } returns listOf(
            com.firewatch.backend.client.NewsArticleResult("같은 제목", "https://example.com/one", "", now),
            com.firewatch.backend.client.NewsArticleResult("같은 제목", "https://example.com/two", "", now),
        )
        val financial = mockk<FinancialDataService>()
        every { financial.fetchLatestSnapshot() } returns FinancialSnapshot(BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE,
            BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, null)
        val collector = MarketCollectionService(portfolios, quotes, feed, runs, news, stocks, runner, observations, financial, settings, recommendations, mockk(relaxed = true))
        collector.collectData(now)
        assertEquals(1, quotes.count())
        owner.watchedStocksRaw = "AAA,BBB"
        settings.save(owner)
        collector.collectData(now.plusSeconds(1))
        assertEquals(2, quotes.count())
        assertEquals(2, feed.count())
        owner.watchedStocksRaw = (1..20).joinToString(",") { "T$it" }
        settings.save(owner)
        collector.collectData(now.plusSeconds(2))
        assertEquals(12, quotes.count())
        collector.collectData(now.plusSeconds(3))
        assertEquals(22, quotes.count())
        verify(exactly = 22) { stocks.fetchPriceHistory(any(), any()) }
        verify(exactly = 1) { financial.fetchLatestSnapshot() }
    }
}
