package com.firewatch.backend.web

import com.firewatch.backend.repository.InstrumentCatalog
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import kotlin.test.*

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:catalog-scale-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.market.collection-cron=-"])
@Transactional
class CatalogScaleIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var catalog: InstrumentCatalog

    @Test fun `삼천 개 검색도 짧은 한글 필터와 안정적인 페이지 및 정확한 일치를 유지한다`() {
        val rows = (0 until 3000).map { i ->
            val symbol = "TEST${i.toString().padStart(4, '0')}"
            val name = "검증기업 ${i.toString().padStart(4, '0')}"
            val metadata = """{"symbol":"$symbol","name":"$name","aliases":[],"sectorId":"test-sector","region":"KR","description":"테스트 전용","source":"https://example.invalid","underlyingIndex":"","issuer":"","assetClass":"STOCK","currency":"KRW","verifiedAt":"2026-10-08"}"""
            arrayOf<Any>(symbol, name, InstrumentCatalog.normalize(name), "${InstrumentCatalog.normalize(name)} ${symbol.lowercase()}", metadata)
        }
        jdbc.batchUpdate("INSERT INTO instrument_catalog (symbol,name,normalized_name,search_text,metadata_json,asset_class,region,sector_id,underlying_index,verified_at) VALUES (?,?,?,?,?,'STOCK','KR','test-sector','','2026-10-08')", rows)
        val started = System.nanoTime()
        val first = catalog.search("검", sectorId = "test-sector", limit = 50)
        val second = catalog.search("검", sectorId = "test-sector", limit = 50, page = 1)
        val last = catalog.search("검", sectorId = "test-sector", limit = 50, page = 59)
        assertEquals(3000, first.total)
        assertEquals(50, first.items.size)
        assertTrue(first.hasMore)
        assertTrue(first.items.map { it.instrument.symbol }.intersect(second.items.map { it.instrument.symbol }.toSet()).isEmpty())
        assertEquals("TEST2999", last.items.last().instrument.symbol)
        assertFalse(last.hasMore)
        assertTrue(catalog.search("검", sectorId = "test-sector", limit = 50, page = 100).items.isEmpty())
        assertEquals("TEST1234", catalog.search("검증기업 1234").items.first().instrument.symbol)
        assertEquals(0, catalog.search("%' OR 1=1 --").total)
        assertFailsWith<IllegalArgumentException> { catalog.search(page = -1) }
        println("CatalogScale: 3000 synthetic rows, 6 bounded queries, elapsedMs=${(System.nanoTime()-started)/1_000_000}")
        val product = jdbc.dataSource!!.connection.use { it.metaData.databaseProductName }
        if (product == "PostgreSQL") {
            val plan = jdbc.queryForList("EXPLAIN (ANALYZE, BUFFERS) SELECT symbol FROM instrument_catalog WHERE search_text LIKE ? ORDER BY name,symbol LIMIT 50 OFFSET 50", String::class.java, "%검%")
            println("CatalogScale PostgreSQL plan:\n${plan.joinToString("\n")}")
        }
        // Transaction rollback removes synthetic rows; production URLs are rejected by TestDatabase.
    }
}
