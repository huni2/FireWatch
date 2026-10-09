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
    @Test @Transactional
    fun `한글 초성 검색은 정확한 이름을 먼저 보여주고 필터와 기존 자료를 보존한다`() {
        assertEquals("005930.KS", catalog.search("ㅅㅅㅈㅈ").items.first().instrument.symbol)
        assertEquals("035720.KS", catalog.search("ㅋㅋㅇ").items.first().instrument.symbol)
        val filtered = catalog.search("ㅅㅅ", assetClass = "STOCK", region = "KR", sectorId = "chips")
        assertEquals("005930.KS", filtered.items.single().instrument.symbol)
        assertEquals(0, catalog.search("ㅅㅅㅈㅈ", region = "US").total)
        assertEquals(0, catalog.search("ㅅㅅㅈㅈ%'").total)
        val first = catalog.search("ㅅ", limit = 50)
        val second = catalog.search("ㅅ", limit = 50, page = 1)
        assertTrue(first.total > 50)
        assertEquals(50, first.items.size)
        assertTrue(first.hasMore)
        assertTrue(first.items.map { it.instrument.symbol }.intersect(second.items.map { it.instrument.symbol }.toSet()).isEmpty())
        val metadata = jdbc.queryForList("SELECT symbol, name, normalized_name, search_text, metadata_json, verified_at FROM instrument_catalog ORDER BY symbol")
        val quotes = jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol")
        jdbc.update("UPDATE instrument_catalog SET name_initials='' WHERE symbol='005930.KS'")
        catalog.run(DefaultApplicationArguments())
        catalog.run(DefaultApplicationArguments())
        assertEquals(metadata, jdbc.queryForList("SELECT symbol, name, normalized_name, search_text, metadata_json, verified_at FROM instrument_catalog ORDER BY symbol"))
        assertEquals(quotes, jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol"))
        assertEquals("ㅅㅅㅈㅈ", jdbc.queryForObject("SELECT name_initials FROM instrument_catalog WHERE symbol='005930.KS'", String::class.java))
        val official = catalog.search("0001A0.KQ").items.single().instrument
        val edited = official.copy(name = "검증 편집 법인", description = "편집 설명 보존")
        val mapper = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()
        jdbc.update("UPDATE instrument_catalog SET name=?, normalized_name=?, search_text=?, metadata_json=?, name_initials='' WHERE symbol=?",
            edited.name, InstrumentCatalog.normalize(edited.name), "편집검색문자열", mapper.writeValueAsString(edited), edited.symbol)
        val editedRows = jdbc.queryForList("SELECT symbol, name, normalized_name, search_text, metadata_json, verified_at FROM instrument_catalog ORDER BY symbol")
        catalog.run(DefaultApplicationArguments())
        assertEquals(edited, catalog.search("ㄱㅈㅍㅈㅂㅇ").items.single().instrument)
        assertEquals(editedRows, jdbc.queryForList("SELECT symbol, name, normalized_name, search_text, metadata_json, verified_at FROM instrument_catalog ORDER BY symbol"))
        WebTestClient.bindToServer().baseUrl("http://localhost:$port").build().get().uri { it.path("/api/stocks/search").queryParam("q", "ㅅㅅㅈㅈ").build() }.exchange().expectStatus().isOk.expectBody().jsonPath("$[0].name").isEqualTo("삼성전자")
    }
    @Test
    fun `한국어 별칭 지수 검색과 상장국 필터를 지원하고 추정 시세를 만들지 않는다`() {
        assertEquals("NVDA", catalog.search("엔비디아").items.first().instrument.symbol)
        assertEquals("NVDA", catalog.search("NVIDIA").items.first().instrument.symbol)
        assertEquals("360750.KS", catalog.search("타이거", assetClass = "ETF").items.single().instrument.symbol)
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
        assertEquals("2026-10-09", catalog.search("카카오").items.first().instrument.verifiedAt)
        assertEquals("2026-10-07", catalog.search("삼성전자").items.single().instrument.verifiedAt)
        val before = catalog.search().total
        val item = catalog.search("카카오").items.first().instrument
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
        assertEquals(newer, catalog.search("카카오").items.first().instrument)
        assertEquals(0, catalog.search("카카오").items.first().price!!.compareTo(java.math.BigDecimal("50000")))
        assertNotNull(catalog.search("카카오").items.first().quoteAt)
        assertEquals(quoteRows, jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol"))
    }

    @Test @Transactional
    fun `공식 법인은 시세 없이 검색되고 반복 시작은 기존 분류와 편집 및 외부 행을 보존한다`() {
        val directory = org.springframework.core.io.ClassPathResource("catalog-directory.json").inputStream.use {
            tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()
                .readValue(it, Array<com.firewatch.backend.repository.CatalogItem>::class.java)
        }
        assertEquals(2651, directory.size)
        val storedSymbols = jdbc.queryForList("SELECT symbol FROM instrument_catalog", String::class.java).toSet()
        assertTrue(storedSymbols.containsAll(directory.map { it.symbol }))
        for (symbol in listOf("0001A0.KQ", "0220W0.KS")) {
            val result = catalog.search(symbol).items.single()
            assertEquals(symbol, result.instrument.symbol)
            assertEquals("unclassified", result.instrument.sectorId)
            assertNull(result.price)
            assertNull(result.quoteAt)
            assertEquals(symbol, catalog.search(result.instrument.name).items.first().instrument.symbol)
        }
        assertEquals("chips", catalog.search("삼성전자").items.first().instrument.sectorId)
        val allRows = jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol")
        val official = catalog.search("0001A0.KQ").items.single().instrument
        val mapper = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()
        val edited = official.copy(description = "운영자 편집 보존", verifiedAt = "2026-10-01")
        jdbc.update("UPDATE instrument_catalog SET metadata_json=?, verified_at=? WHERE symbol=?", mapper.writeValueAsString(edited), java.sql.Date.valueOf(edited.verifiedAt), official.symbol)
        jdbc.update("INSERT INTO instrument_catalog (symbol,name,normalized_name,search_text,metadata_json,asset_class,region,sector_id,underlying_index,verified_at) VALUES (?,?,?,?,?,'STOCK','KR','unclassified','','2026-10-01')", "EXTERNAL", "외부 보존", "외부보존", "외부보존", mapper.writeValueAsString(edited.copy(symbol = "EXTERNAL", name = "외부 보존")))
        catalog.run(DefaultApplicationArguments())
        catalog.run(DefaultApplicationArguments())
        assertEquals(allRows.size + 1, catalog.search().total)
        assertEquals(edited, catalog.search(official.symbol).items.single().instrument)
        assertEquals("EXTERNAL", catalog.search("외부 보존").items.single().instrument.symbol)
        assertEquals(allRows.filter { it["symbol"] != official.symbol }, jdbc.queryForList("SELECT * FROM instrument_catalog WHERE symbol<>? AND symbol<>'EXTERNAL' ORDER BY symbol", official.symbol))
    }
}
