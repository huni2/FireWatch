package com.firewatch.backend.web

import com.firewatch.backend.repository.InstrumentCatalog
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import org.springframework.boot.DefaultApplicationArguments
import kotlin.test.*

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:catalog-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-"])
class CatalogIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @Autowired lateinit var catalog: InstrumentCatalog
    @Autowired lateinit var jdbc: JdbcTemplate
    @LocalServerPort var port: Int = 0
    @Test
    fun `한국어 별칭 지수 검색과 상장국 필터를 지원하고 추정 시세를 만들지 않는다`() {
        assertEquals("NVDA", catalog.search("엔비디아").items.first().instrument.symbol)
        assertEquals("NVDA", catalog.search("NVIDIA").items.first().instrument.symbol)
        assertEquals("360750.KS", catalog.search("타이거").items.single().instrument.symbol)
        val us = catalog.search("S&P500", "ETF", "US")
        assertEquals(3, us.total)
        assertTrue(us.items.all { it.price == null && it.quoteAt == null && it.instrument.currency == "USD" })
        assertEquals(2, catalog.search("S&P 500", "ETF", "KR").total)
        assertEquals(0, catalog.search("%_'").total)
        assertEquals(5, catalog.search("", "STOCK", "", "chips").total)
        WebTestClient.bindToServer().baseUrl("http://localhost:$port").build().get().uri("/api/catalog?assetClass=ETF&region=KR").exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(2)
        WebTestClient.bindToServer().baseUrl("http://localhost:$port").build().get().uri("/api/catalog?page=-1").exchange().expectStatus().isBadRequest
    }

    @Test @Transactional
    fun `추가 기업 별칭 검색과 시드 재적용에서 최신 메타데이터와 수집 시세를 보존한다`() {
        assertEquals("035720.KS", catalog.search("Kakao").items.single().instrument.symbol)
        assertEquals("000660.KS", catalog.search("하이닉스").items.single().instrument.symbol)
        assertEquals("GOOGL", catalog.search("구글").items.single().instrument.symbol)
        assertEquals("2026-10-09", catalog.search("카카오").items.single().instrument.verifiedAt)
        assertEquals("2026-10-07", catalog.search("삼성전자").items.single().instrument.verifiedAt)
        val before = catalog.search().total
        val item = catalog.search("카카오").items.single().instrument
        val mapper = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()
        val newer = item.copy(description = "최신 외부 확인 자료", verifiedAt = "2026-10-10")
        jdbc.update("UPDATE instrument_catalog SET metadata_json=?, verified_at=? WHERE symbol=?", mapper.writeValueAsString(newer), java.sql.Date.valueOf(newer.verifiedAt), item.symbol)
        val quoteTime = java.sql.Timestamp.valueOf("2026-10-09 08:00:00")
        if (jdbc.update("UPDATE market_quotes SET price=?, as_of=?, collected_at=? WHERE symbol=?", java.math.BigDecimal("50000"), quoteTime, quoteTime, item.symbol) == 0) {
            jdbc.update("INSERT INTO market_quotes (symbol,price,as_of,collected_at) VALUES (?,?,?,?)", item.symbol, java.math.BigDecimal("50000"), quoteTime, quoteTime)
        }
        val quoteRows = jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol")
        catalog.run(DefaultApplicationArguments())
        catalog.run(DefaultApplicationArguments())
        assertEquals(before, catalog.search().total)
        assertEquals(newer, catalog.search("카카오").items.single().instrument)
        assertEquals(0, catalog.search("카카오").items.single().price!!.compareTo(java.math.BigDecimal("50000")))
        assertNotNull(catalog.search("카카오").items.single().quoteAt)
        assertEquals(quoteRows, jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol"))
    }
}
