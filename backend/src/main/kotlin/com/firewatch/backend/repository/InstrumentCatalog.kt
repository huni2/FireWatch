package com.firewatch.backend.repository

import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionTemplate
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.time.Instant
import org.springframework.beans.factory.annotation.Value

data class CatalogItem(val symbol: String, val name: String, val aliases: List<String>, val sectorId: String,
    val region: String, val description: String, val source: String, val underlyingIndex: String,
    val issuer: String, val assetClass: String, val currency: String, val verifiedAt: String)
data class CatalogView(val instrument: CatalogItem, val price: BigDecimal?, val quoteAt: Instant?)
data class CatalogPage(val items: List<CatalogView>, val total: Int, val hasMore: Boolean)
internal data class CatalogQueries(val countSql: String, val countArgs: Array<Any>, val rowSql: String, val rowArgs: Array<Any>, val size: Int)

/** Curated, versioned metadata; startup never removes older catalog rows or investment records. */
@Component
class InstrumentCatalog(private val jdbc: JdbcTemplate, private val transactions: TransactionTemplate,
    @Value("\${spring.sql.init.platform:h2}") private val databasePlatform: String) : ApplicationRunner {
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    override fun run(args: ApplicationArguments) {
        val seed = ClassPathResource("catalog-seed.json").inputStream.use { mapper.readValue(it, Array<CatalogItem>::class.java) }
        val directory = ClassPathResource("catalog-directory.json").inputStream.use { mapper.readValue(it, Array<CatalogItem>::class.java) }
        transactions.executeWithoutResult {
            for (item in seed) {
                val existing = jdbc.queryForList("SELECT verified_at FROM instrument_catalog WHERE symbol=?", item.symbol).singleOrNull()
                // Preserve newer imported metadata. Version bumps deliberately refresh curated fields.
                if (existing != null && existing["verified_at"].toString() >= item.verifiedAt) continue
                val values = arrayOf<Any>(item.name, normalize(item.name), listOf(item.name, item.symbol, item.description, item.underlyingIndex, *item.aliases.toTypedArray()).joinToString(" ") { normalize(it) }, mapper.writeValueAsString(item), item.assetClass, item.region, item.sectorId, item.underlyingIndex, java.sql.Date.valueOf(item.verifiedAt), item.symbol)
                if (existing == null) jdbc.update("INSERT INTO instrument_catalog (name, normalized_name, search_text, metadata_json, asset_class, region, sector_id, underlying_index, verified_at, symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)" + if (databasePlatform == "postgresql") " ON CONFLICT (symbol) DO NOTHING" else "", *values)
                else jdbc.update("UPDATE instrument_catalog SET name=?, normalized_name=?, search_text=?, metadata_json=?, asset_class=?, region=?, sector_id=?, underlying_index=?, verified_at=? WHERE symbol=? AND verified_at<?", *values, java.sql.Date.valueOf(item.verifiedAt))
            }
            // Official company names extend search only; curated metadata and all quotes remain untouched.
            val existingSymbols = jdbc.queryForList("SELECT symbol FROM instrument_catalog", String::class.java).toHashSet()
            val missing = directory.filter { it.symbol !in existingSymbols }
            if (missing.isNotEmpty()) jdbc.batchUpdate(
                "INSERT INTO instrument_catalog (name, normalized_name, search_text, metadata_json, asset_class, region, sector_id, underlying_index, verified_at, symbol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)" +
                    if (databasePlatform == "postgresql") " ON CONFLICT (symbol) DO NOTHING" else "",
                missing, 250
            ) { statement, item ->
                statement.setString(1, item.name)
                statement.setString(2, normalize(item.name))
                statement.setString(3, listOf(item.name, item.symbol, item.description).joinToString(" ") { normalize(it) })
                statement.setString(4, mapper.writeValueAsString(item))
                statement.setString(5, item.assetClass)
                statement.setString(6, item.region)
                statement.setString(7, item.sectorId)
                statement.setString(8, item.underlyingIndex)
                statement.setDate(9, java.sql.Date.valueOf(item.verifiedAt))
                statement.setString(10, item.symbol)
            }
            val refreshed = DirectoryCatalogRefresh(jdbc).apply(directory.toList(), seed.map { it.symbol }.toSet())
            org.slf4j.LoggerFactory.getLogger(InstrumentCatalog::class.java).info(
                "catalog_refresh baselined={} updated={} preserved={}", refreshed.baselined, refreshed.updated, refreshed.preserved)
            // Derive only the search field from current DB names, preserving edited metadata.
            val names = jdbc.query("SELECT symbol, name, name_initials FROM instrument_catalog", { row, _ ->
                Triple(row.getString("symbol"), row.getString("name"), row.getString("name_initials"))
            }).filter { (_, name, stored) -> initials(name) != stored }
            if (names.isNotEmpty()) jdbc.batchUpdate(
                "UPDATE instrument_catalog SET name_initials=? WHERE symbol=? AND name=? AND name_initials=?", names, 250
            ) { statement, row ->
                statement.setString(1, initials(row.second))
                statement.setString(2, row.first)
                statement.setString(3, row.second)
                statement.setString(4, row.third)
            }
        }
    }

    fun search(query: String = "", assetClass: String = "", region: String = "", sectorId: String = "", limit: Int = 20, page: Int = 0): CatalogPage {
        val sql = searchQueries(query, assetClass, region, sectorId, limit, page)
        val total = jdbc.queryForObject(sql.countSql, Int::class.java, *sql.countArgs) ?: 0
        val rows = jdbc.query(sql.rowSql, { row, _ -> CatalogView(mapper.readValue(row.getString("metadata_json"), CatalogItem::class.java), row.getBigDecimal("price"), row.getTimestamp("as_of")?.toInstant()) }, *sql.rowArgs)
        return CatalogPage(rows, total, total > page * sql.size + rows.size)
    }

    internal fun searchQueries(query: String, assetClass: String = "", region: String = "", sectorId: String = "", limit: Int = 50, page: Int = 0): CatalogQueries {
        require(page in 0..10000) { "카탈로그 페이지 범위를 확인해주세요." }
        val size = limit.coerceIn(1, 50)
        val term = normalize(query.take(100))
        val initialQuery = term.isNotEmpty() && term.all { it in INITIALS }
        val pattern = "%${term.replace("!", "!!").replace("%", "!%").replace("_", "!_")}%"
        val searchColumn = if (initialQuery) "c.name_initials" else "c.search_text"
        val exactColumn = if (initialQuery) "c.name_initials" else "c.normalized_name"
        val where = "WHERE $searchColumn LIKE ? ESCAPE '!' AND (?='' OR c.asset_class=?) AND (?='' OR c.region=?) AND (?='' OR c.sector_id=?)"
        val args = arrayOf<Any>(pattern, assetClass, assetClass, region, region, sectorId, sectorId)
        val emptyInput = query.isBlank() && term.isEmpty()
        if (emptyInput) {
            val filters = listOf("asset_class" to assetClass, "region" to region, "sector_id" to sectorId).filter { it.second.isNotEmpty() }
            val pageWhere = if (filters.isEmpty()) "" else "WHERE " + filters.joinToString(" AND ") { "c.${it.first}=?" }
            // Page over narrow index fields first, then read metadata and unique quotes only for that page.
            val pageSql = "SELECT c.symbol,c.name FROM instrument_catalog c $pageWhere ORDER BY c.name,c.symbol LIMIT ? OFFSET ?"
            return CatalogQueries("SELECT COUNT(*) FROM instrument_catalog c $where", args,
                "SELECT c.metadata_json,q.price,q.as_of FROM ($pageSql) page JOIN instrument_catalog c ON c.symbol=page.symbol LEFT JOIN market_quotes q ON c.symbol=q.symbol ORDER BY page.name,page.symbol",
                (filters.map { it.second } + listOf<Any>(size, page * size)).toTypedArray(), size)
        }
        val order = "CASE WHEN $exactColumn=? THEN 0 WHEN c.symbol=? THEN 0 ELSE 1 END, c.name, c.symbol"
        val orderArgs = listOf<Any>(term, query.trim().uppercase())
        return CatalogQueries("SELECT COUNT(*) FROM instrument_catalog c $where", args,
            "SELECT c.metadata_json, q.price, q.as_of FROM instrument_catalog c LEFT JOIN market_quotes q ON c.symbol=q.symbol $where ORDER BY $order LIMIT ? OFFSET ?",
            (args.toList() + orderArgs + listOf<Any>(size, page * size)).toTypedArray(), size)
    }

    companion object {
        private const val INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
        fun normalize(value: String) = value.lowercase().replace(Regex("[\\s&._-]"), "")
        fun initials(value: String) = normalize(value).map { character ->
            if (character in '\uAC00'..'\uD7A3') INITIALS[(character.code - 0xAC00) / 588] else character
        }.joinToString("")
    }
}
