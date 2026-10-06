package com.firewatch.backend.web

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.http.MediaType
import org.springframework.beans.factory.annotation.Autowired
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.entity.Briefing
import java.math.BigDecimal
import java.time.LocalDate

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:portfolio-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-"])
class PortfolioApiIntegrationTest {
    @Autowired private lateinit var auditLogs: com.firewatch.backend.repository.AuditLogRepository
    @Autowired private lateinit var briefings: BriefingRepository
    @Autowired private lateinit var gameSessions: com.firewatch.backend.repository.GameSessionRepository
    @Autowired private lateinit var feed: com.firewatch.backend.repository.NewsFeedRepository
    @Autowired private lateinit var briefingNews: com.firewatch.backend.repository.NewsArticleRepository
    @LocalServerPort private var port: Int = 0
    private val client get() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()

    @Test
    fun `공개 감사 로그는 이전에 저장한 개인 포트폴리오 내용도 노출하지 않는다`() {
        auditLogs.save(com.firewatch.backend.entity.AuditLog(eventType = com.firewatch.backend.entity.AuditEventType.PORTFOLIO,
            actionName = "privatePortfolio", status = com.firewatch.backend.entity.AuditStatus.SUCCESS,
            responseSummary = "private-owner-secret: holdings=123456", requestPayload = "private-request"))
        client.get().uri("/api/audit-logs?eventType=PORTFOLIO").exchange().expectStatus().isOk.expectBody()
            .consumeWith { result ->
                val body = String(result.responseBody!!)
                kotlin.test.assertFalse(body.contains("private-owner-secret"))
                kotlin.test.assertFalse(body.contains("private-request"))
                kotlin.test.assertTrue(body.contains("상세 내용은 공개하지 않습니다"))
            }
    }

    @Test
    fun `이력의 일괄 뉴스 조회는 날짜별 기사를 섞거나 누락하지 않는다`() {
        val first = briefings.save(Briefing(briefingDate = LocalDate.of(2024, 2, 1), marketSummary = "첫 날짜", dataSourceStatus = com.firewatch.backend.entity.DataSourceStatus.NORMAL))
        val second = briefings.save(Briefing(briefingDate = LocalDate.of(2024, 2, 2), marketSummary = "둘째 날짜", dataSourceStatus = com.firewatch.backend.entity.DataSourceStatus.NORMAL))
        briefingNews.save(com.firewatch.backend.entity.NewsArticle(briefingId = first.id!!, title = "첫 날짜 기사", link = "https://example.com/first"))
        briefingNews.save(com.firewatch.backend.entity.NewsArticle(briefingId = second.id!!, title = "둘째 날짜 기사", link = "https://example.com/second"))
        client.get().uri("/api/briefings?from=2024-02-01&to=2024-02-02").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$[0].news[0].title").isEqualTo("둘째 날짜 기사")
            .jsonPath("$[1].news[0].title").isEqualTo("첫 날짜 기사")
    }

    @Test
    fun `실제 뉴스 보관함은 과거 브리핑과 RSS를 날짜 키워드로 검색하고 삭제하지 않는다`() {
        val old = briefings.save(Briefing(briefingDate = LocalDate.of(2025, 1, 1), marketSummary = "과거", dataSourceStatus = com.firewatch.backend.entity.DataSourceStatus.NORMAL))
        briefingNews.save(com.firewatch.backend.entity.NewsArticle(briefingId = old.id!!, title = "반도체 과거 뉴스", link = "https://example.com/archive", pubDate = java.time.Instant.parse("2025-01-01T02:00:00Z")))
        feed.save(com.firewatch.backend.entity.NewsFeedItem("archive-duplicate", "반도체 과거 뉴스", "https://example.com/archive", "반도체", java.time.Instant.parse("2025-01-01T02:00:00Z")))
        feed.save(com.firewatch.backend.entity.NewsFeedItem("archive-new", "반도체 최근 뉴스", "https://example.com/latest", "반도체", java.time.Instant.parse("2026-10-06T02:00:00Z")))
        val before = feed.count()
        client.get().uri("/api/news?from=2025-01-01&to=2025-01-01&q=반도체&size=1").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.total").isEqualTo(1).jsonPath("$.news[0].title").isEqualTo("반도체 과거 뉴스").jsonPath("$.hasMore").isEqualTo(false)
        client.get().uri("/api/news?q=반도체&size=1").exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(2).jsonPath("$.hasMore").isEqualTo(true)
        client.get().uri("/api/news?q=반도체&size=1&page=1").exchange().expectStatus().isOk.expectBody().jsonPath("$.news[0].title").isEqualTo("반도체 과거 뉴스")
        client.get().uri("/api/news?from=2026-10-07&to=2025-01-01").exchange().expectStatus().isBadRequest
        kotlin.test.assertEquals(before, feed.count())
    }

    @Test
    fun `완전 가상 게임은 실제 데이터 없이 시작하고 체결과 다음 턴을 처리한다`() {
        client.post().uri("/api/game/start").header("X-Device-Id", "virtual-api-a").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.simulation").isEqualTo(true).jsonPath("$.totalTurns").isEqualTo(24).jsonPath("$.stockPrices.AURA").isEqualTo(24000)
        client.post().uri("/api/game/trade").header("X-Device-Id", "virtual-api-a").contentType(MediaType.APPLICATION_JSON)
            .bodyValue("""{"instrumentType":"STOCK","symbol":"AURA","action":"BUY","quantity":10,"expectedPrice":24000,"expectedTurnIndex":0,"requestId":"virtual-api-order"}""")
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.transactions[0].total").isEqualTo(240000).jsonPath("$.cash").isEqualTo(9760000)
        client.post().uri("/api/game/next-turn").header("X-Device-Id", "virtual-api-a").contentType(MediaType.APPLICATION_JSON).bodyValue("""{"expectedTurnIndex":0}""")
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.turnIndex").isEqualTo(1).jsonPath("$.holdings[0].quantity").isEqualTo(10).jsonPath("$.briefing.news[0].link").isEqualTo("")
    }

    @Test
    fun `게임 가격 스냅샷과 주문 미리보기 체결 영수증 및 턴 실패를 실제 DB API로 검증한다`() {
        val days = listOf(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2))
        val saved = briefings.saveAll(days.map { Briefing(briefingDate = it, marketSummary = "게임 테스트", goldPrice = BigDecimal("2000"), dataSourceStatus = com.firewatch.backend.entity.DataSourceStatus.NORMAL) })
        gameSessions.save(com.firewatch.backend.entity.GameSession(deviceId = "game-api-a", turnDatesRaw = days.joinToString(","), startingCash = BigDecimal("10000000")))
        client.get().uri("/api/game/current").header("X-Device-Id", "game-api-a").exchange().expectStatus().isOk
        val order = """{"instrumentType":"GOLD","action":"BUY","quantity":10,"expectedTurnIndex":0,"expectedPrice":2000,"requestId":"game-api-order"}"""
        client.post().uri("/api/game/preview").header("X-Device-Id", "game-api-a").contentType(MediaType.APPLICATION_JSON).bodyValue(order)
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(20000).jsonPath("$.cashAfter").isEqualTo(9980000)
        repeat(2) {
            client.post().uri("/api/game/trade").header("X-Device-Id", "game-api-a").contentType(MediaType.APPLICATION_JSON).bodyValue(order)
                .exchange().expectStatus().isOk.expectBody().jsonPath("$.transactions.length()").isEqualTo(1).jsonPath("$.holdings[0].quantity").isEqualTo(10)
                .jsonPath("$.transactions[0].total").isEqualTo(20000).jsonPath("$.portfolioValue").isEqualTo(10000000)
        }
        briefings.saveAll(saved.onEach { it.goldPrice = null })
        client.get().uri("/api/game/current").header("X-Device-Id", "game-api-a").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.holdings[0].currentPrice").isEqualTo(2000).jsonPath("$.portfolioValue").isEqualTo(10000000)
        client.post().uri("/api/game/next-turn").header("X-Device-Id", "game-api-a").contentType(MediaType.APPLICATION_JSON).bodyValue("""{"expectedTurnIndex":0}""")
            .exchange().expectStatus().isBadRequest
        client.get().uri("/api/game/current").header("X-Device-Id", "game-api-a").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.turnIndex").isEqualTo(0).jsonPath("$.holdings[0].quantity").isEqualTo(10).jsonPath("$.cash").isEqualTo(9980000)
        client.get().uri("/api/game/current").header("X-Device-Id", "game-api-b").exchange().expectStatus().isNotFound
        client.post().uri("/api/game/start").header("X-Device-Id", "game-api-a").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.simulation").isEqualTo(true).jsonPath("$.holdings.length()").isEqualTo(0)
        kotlin.test.assertTrue(gameSessions.findAll().any { it.deviceId == "game-api-a" && it.status == com.firewatch.backend.entity.GameSessionStatus.ENDED && it.simulationSeed == null })
    }

    private fun input(version: Int, symbol: String = "005930.KS", currency: String = "KRW") = """{
      "version":$version,"goal":"장기 자산 형성","horizonMonths":60,"riskLevel":"BALANCED","accountType":"GENERAL",
      "monthlyContribution":300000,"cash":100000,
      "holdings":[{"symbol":"$symbol","name":"삼성전자","quantity":10,"averageCost":70000,"currency":"$currency","assetClass":"STOCK","sector":"반도체","region":"KR","underlyingIndex":""}]
    }"""

    @Test
    fun `저장 분석 조회와 사용자 격리 및 변경 충돌을 검증한다`() {
        client.put().uri("/api/portfolio").header("X-Device-Id", "portfolio-a").contentType(MediaType.APPLICATION_JSON).bodyValue(input(0))
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.investedKrw").isEqualTo(700000).jsonPath("$.totalValueKrw").isEmpty
            .jsonPath("$.targetAllocation.ETF").isEqualTo(50).jsonPath("$.contributionPlan.ETF").isEqualTo(150000)
        client.get().uri("/api/portfolio").header("X-Device-Id", "portfolio-a").exchange().expectStatus().isOk.expectBody().jsonPath("$.holdings.length()").isEqualTo(1)
        client.get().uri("/api/portfolio").header("X-Device-Id", "portfolio-b").exchange().expectStatus().isOk.expectBody().jsonPath("$.holdings.length()").isEqualTo(0)
        client.put().uri("/api/portfolio").header("X-Device-Id", "portfolio-a").contentType(MediaType.APPLICATION_JSON).bodyValue(input(0)).exchange().expectStatus().isOk.expectBody().jsonPath("$.version").isEqualTo(1)
        client.put().uri("/api/portfolio").header("X-Device-Id", "portfolio-a").contentType(MediaType.APPLICATION_JSON).bodyValue(input(0)).exchange().expectStatus().isEqualTo(409)
    }

    @Test
    fun `누락 신원과 공개된 기존 신원은 거부한다`() {
        client.get().uri("/api/portfolio").exchange().expectStatus().isBadRequest
        client.get().uri("/api/portfolio").header("X-Device-Id", "legacy-owner-device").exchange().expectStatus().isUnauthorized
    }

    @Test
    fun `통화가 다른 자산은 합산 전에 거부한다`() {
        client.put().uri("/api/portfolio").header("X-Device-Id", "portfolio-invalid").contentType(MediaType.APPLICATION_JSON).bodyValue(input(0, "AAPL", "KRW")).exchange().expectStatus().isBadRequest
    }

    @Test
    fun `푸시 토큰만 등록해도 기존 설정은 유지한다`() {
        client.put().uri("/api/settings").header("X-Device-Id", "partial-a").contentType(MediaType.APPLICATION_JSON).bodyValue("""{"pushTime":"09:00","interestKeywords":["반도체"],"watchedStocks":["005930.KS"]}""").exchange().expectStatus().isOk
        client.put().uri("/api/settings").header("X-Device-Id", "partial-a").contentType(MediaType.APPLICATION_JSON).bodyValue("""{"fcmToken":"test-token"}""").exchange().expectStatus().isOk.expectBody().jsonPath("$.pushTime").isEqualTo("09:00").jsonPath("$.watchedStocks[0]").isEqualTo("005930.KS")
    }
}
