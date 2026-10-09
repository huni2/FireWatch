// 실제 카탈로그 검색 SQL과 PostgreSQL 후보 인덱스의 시간·계획·공간 비용을 비교한다.
package com.firewatch.backend.web

import com.firewatch.backend.repository.CatalogItem
import com.firewatch.backend.repository.CatalogPage
import com.firewatch.backend.repository.InstrumentCatalog
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.*

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:catalog-real-scale;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.market.collection-cron=-"])
@Transactional
class CatalogRealScaleIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var catalog: InstrumentCatalog
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    private data class Search(val label: String, val q: String = "", val type: String = "", val region: String = "", val sector: String = "", val page: Int = 0)
    private val cases = listOf(Search("all"), Search("name", "삼성전자"), Search("initials", "ㅅㅅㅈㅈ"),
        Search("short-hangul", "삼"), Search("short-initial", "ㅅ"), Search("initial-page", "ㅅ", page = 1),
        Search("sector", "", "STOCK", "KR", "chips"), Search("etfs", "", "ETF"),
        Search("zero", "없는회사검증문자열"), Search("deep-page", page = 53))
    private fun search(case: Search) = catalog.search(case.q, case.type, case.region, case.sector, 50, case.page)

    @Test fun `실제 자료의 검색 결과를 유지하며 서비스와 SQL 및 후보 인덱스 비용을 기록한다`() {
        val source = listOf("catalog-seed.json", "catalog-directory.json").flatMap { file ->
            ClassPathResource(file).inputStream.use { mapper.readValue(it, Array<CatalogItem>::class.java).toList() }
        }.map { it.symbol }.toSet()
        assertTrue(source.size > 2000)
        assertEquals(source, jdbc.queryForList("SELECT symbol FROM instrument_catalog", String::class.java).toSet())
        val before = jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol")
        val quotes = jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol")
        val baseline = cases.associate { it.label to search(it) }
        assertEquals(source.size, baseline.getValue("all").total)
        assertEquals("005930.KS", baseline.getValue("name").items.first().instrument.symbol)
        assertEquals("005930.KS", baseline.getValue("initials").items.first().instrument.symbol)
        assertTrue(baseline.getValue("short-initial").hasMore)
        assertTrue(baseline.getValue("short-initial").items.map { it.instrument.symbol }.intersect(baseline.getValue("initial-page").items.map { it.instrument.symbol }.toSet()).isEmpty())
        assertEquals(0, baseline.getValue("zero").total)
        val product = jdbc.dataSource!!.connection.use { it.metaData.databaseProductName }
        val postgres = product == "PostgreSQL"
        if (postgres) { jdbc.execute("ANALYZE instrument_catalog"); jdbc.execute("ANALYZE market_quotes") }
        val stages = mutableListOf<Map<String, Any>>()
        stages += measure("existing-indexes", baseline, postgres)
        var indexBytes = 0L
        if (postgres) {
            // TestDatabase only permits the dedicated localhost CI database; candidate DDL is rolled back.
            assertNull(jdbc.queryForObject("SELECT to_regclass('fw_test_catalog_text_trgm')::text", String::class.java))
            assertNull(jdbc.queryForObject("SELECT to_regclass('fw_test_catalog_initial_trgm')::text", String::class.java))
            jdbc.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
            try {
                jdbc.execute("CREATE INDEX fw_test_catalog_text_trgm ON instrument_catalog USING gin(search_text gin_trgm_ops)")
                jdbc.execute("CREATE INDEX fw_test_catalog_initial_trgm ON instrument_catalog USING gin(name_initials gin_trgm_ops)")
                indexBytes = jdbc.queryForObject("SELECT pg_relation_size('fw_test_catalog_text_trgm') + pg_relation_size('fw_test_catalog_initial_trgm')", Long::class.java)!!
                stages += measure("candidate-trgm", baseline, true)
            } finally {
                jdbc.execute("DROP INDEX IF EXISTS fw_test_catalog_text_trgm")
                jdbc.execute("DROP INDEX IF EXISTS fw_test_catalog_initial_trgm")
            }
        }
        assertEquals(before, jdbc.queryForList("SELECT * FROM instrument_catalog ORDER BY symbol"))
        assertEquals(quotes, jdbc.queryForList("SELECT * FROM market_quotes ORDER BY symbol"))
        val report = linkedMapOf<String, Any>("database" to product, "catalogRows" to source.size, "quoteRows" to quotes.size, "repetitions" to 7,
            "candidateIndexBytes" to indexBytes, "stages" to stages, "productionWrites" to 0)
        if (postgres) report["catalogTotalBytes"] = jdbc.queryForObject("SELECT pg_total_relation_size('instrument_catalog')", Long::class.java)!!
        val path = Path.of("build/reports/catalog-search-${product.lowercase()}.json")
        Files.createDirectories(path.parent)
        Files.writeString(path, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report))
        println("CatalogRealScale report=$path rows=${source.size} candidateIndexBytes=$indexBytes")
        for (stage in stages) println("CatalogRealScale summary=" + mapper.writeValueAsString(stage["summary"]))
    }

    private fun measure(stage: String, baseline: Map<String, CatalogPage>, postgres: Boolean): Map<String, Any> {
        val summary = mutableListOf<Map<String, Any>>()
        val plans = linkedMapOf<String, Any>()
        for (case in cases) {
            assertEquals(baseline.getValue(case.label), search(case))
            val times = (1..7).map {
                val start = System.nanoTime()
                val result = search(case)
                val elapsed = (System.nanoTime() - start) / 1_000_000.0
                assertEquals(baseline.getValue(case.label), result)
                elapsed
            }.sorted()
            val row = linkedMapOf<String, Any>("stage" to stage, "case" to case.label, "total" to baseline.getValue(case.label).total,
                "serviceMedianMs" to times[3], "serviceMaxMs" to times.last())
            if (postgres) {
                val sql = catalog.searchQueries(case.q, case.type, case.region, case.sector, 50, case.page)
                for ((label, statement, args) in listOf(Triple("count", sql.countSql, sql.countArgs), Triple("rows", sql.rowSql, sql.rowArgs))) {
                    val json = jdbc.queryForObject("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) $statement", String::class.java, *args)!!
                    val plan = mapper.readTree(json)[0]
                    row["${label}SqlMs"] = plan["Execution Time"].asDouble()
                    plans["${case.label}-$label"] = mapper.readTree(json)
                }
            }
            summary += row
        }
        return mapOf("stage" to stage, "summary" to summary, "plans" to plans)
    }
}
