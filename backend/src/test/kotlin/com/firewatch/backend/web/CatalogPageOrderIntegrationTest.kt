// 빈 목록 정렬의 기존 결과 보존과 실제 PostgreSQL 전후 비용을 대조한다.
package com.firewatch.backend.web

import com.firewatch.backend.repository.InstrumentCatalog
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.*

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:catalog-page-order;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.market.collection-cron=-"])
@Transactional
class CatalogPageOrderIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var catalog: InstrumentCatalog
    private val mapper = JsonMapper.builder().findAndAddModules().build()

    private fun legacy(q: String, type: String = "", region: String = "", sector: String = "", page: Int = 0): Pair<String, Array<Any>> {
        val sql = catalog.searchQueries(q, type, region, sector, 50, page)
        if (q.isNotBlank()) return sql.rowSql to sql.rowArgs
        return sql.rowSql.replace("ORDER BY c.name, c.symbol", "ORDER BY CASE WHEN c.normalized_name=? THEN 0 WHEN c.symbol=? THEN 0 ELSE 1 END, c.name, c.symbol") to
            (sql.countArgs.toList() + listOf<Any>(InstrumentCatalog.normalize(q), q.trim().uppercase(), 50, page * 50)).toTypedArray()
    }

    @Test fun `동일 이름과 시세를 포함해 빈 공백 필터 경계 페이지의 결과가 기존 SQL과 같다`() {
        val before = jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol")
        val original = catalog.search("005930.KS").items.first().instrument
        for (symbol in listOf("TEST-TIE-A", "TEST-TIE-B")) {
            val item = original.copy(symbol = symbol, name = "페이지 동일 이름", sectorId = "test-page")
            jdbc.update("INSERT INTO instrument_catalog(symbol,name,normalized_name,search_text,metadata_json,asset_class,region,sector_id,underlying_index,verified_at) VALUES(?,?,?,?,?,'STOCK','KR','test-page','','2026-10-09')",
                symbol, item.name, InstrumentCatalog.normalize(item.name), InstrumentCatalog.normalize(item.name), mapper.writeValueAsString(item))
        }
        jdbc.update("INSERT INTO market_quotes(symbol,price,as_of,collected_at) VALUES('TEST-TIE-A',12345,'2026-10-09 08:00:00','2026-10-09 08:00:00')")
        val saved = jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol")
        val quotes = jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol")
        for (q in listOf("", "  \t", "삼성전자", "ㅅㅅㅈㅈ", "005930.KS", " &._- ")) {
            for (page in listOf(0, 1, 53, 54, 10000)) {
                val (old, args) = legacy(q, page = page)
                val new = catalog.searchQueries(q, page = page)
                assertEquals(jdbc.queryForList(old, *args), jdbc.queryForList(new.rowSql, *new.rowArgs), "$q/$page")
            }
        }
        for ((type, region, sector) in listOf(Triple("ETF", "", ""), Triple("STOCK", "KR", "chips"), Triple("STOCK", "KR", "test-page"))) {
            val (old, args) = legacy("", type, region, sector)
            val sql = catalog.searchQueries("", type, region, sector)
            assertEquals(jdbc.queryForList(old, *args), jdbc.queryForList(sql.rowSql, *sql.rowArgs))
        }
        val tied = catalog.search(sectorId = "test-page")
        assertEquals(listOf("TEST-TIE-A", "TEST-TIE-B"), tied.items.map { it.instrument.symbol })
        assertEquals(0, tied.items[0].price!!.compareTo(java.math.BigDecimal("12345")))
        assertNotNull(tied.items[0].quoteAt)
        assertNull(tied.items[1].price)
        assertEquals(saved, jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol"))
        assertEquals(quotes, jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol"))
        assertEquals(before.size + 2, saved.size)
    }

    @Test fun `PostgreSQL은 실제 첫 마지막 페이지를 시세 없음과 전 종목 가상 시세 조건으로 측정한다`() {
        val product = jdbc.dataSource!!.connection.use { it.metaData.databaseProductName }
        if (product != "PostgreSQL") return
        val before = jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol")
        val quotes = jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol")
        val reports = mutableListOf<Map<String, Any>>()
        fun measure(label: String) {
            jdbc.execute("ANALYZE instrument_catalog")
            jdbc.execute("ANALYZE market_quotes")
            for (page in listOf(0, 53)) {
                val old = legacy("", page = page)
                val new = catalog.searchQueries("", page = page)
                val queries = listOf("legacy-case" to old, "page-order" to (new.rowSql to new.rowArgs))
                val expected = jdbc.queryForList(old.first, *old.second)
                for ((method, query) in queries) {
                    assertEquals(expected, jdbc.queryForList(query.first, *query.second))
                    val times = (1..7).map {
                        val start = System.nanoTime()
                        val rows = jdbc.queryForList(query.first, *query.second)
                        val elapsed = (System.nanoTime() - start) / 1_000_000.0
                        assertEquals(expected, rows)
                        elapsed
                    }.sorted()
                    val plan = mapper.readTree(jdbc.queryForObject("EXPLAIN(ANALYZE,BUFFERS,FORMAT JSON) ${query.first}", String::class.java, *query.second)!!)
                    reports += mapOf("fixture" to label, "method" to method, "page" to page, "queryMedianMs" to times[3], "queryMaxMs" to times.last(), "sqlMs" to plan[0]["Execution Time"].asDouble(), "plan" to plan)
                }
            }
        }
        measure("existing-quotes")
        // Artificial prices only in the dedicated test transaction, explicitly distinguished from market data.
        jdbc.execute("INSERT INTO market_quotes(symbol,price,as_of,collected_at) SELECT symbol,1000,TIMESTAMP '2026-10-09 08:00:00',TIMESTAMP '2026-10-09 08:00:00' FROM instrument_catalog ON CONFLICT(symbol) DO NOTHING")
        measure("synthetic-quotes-all")
        val report = mapOf("catalogRows" to before.size, "existingQuoteRows" to quotes.size, "orderIndexBytes" to jdbc.queryForObject("SELECT pg_relation_size('idx_catalog_page_order')", Long::class.java)!!, "reports" to reports, "productionWrites" to 0)
        val path = Path.of("build/reports/catalog-search-page-order.json")
        Files.createDirectories(path.parent)
        Files.writeString(path, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report))
        assertEquals(before, jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol"))
        // @Transactional rolls back synthetic quotes; no production URL is accepted by TestDatabase.
        println("CatalogPageOrder report=$path")
    }
}
