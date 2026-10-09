// 마지막 공식 적용값과 일치하는 회사 정보만 다음 날짜 자료로 안전하게 갱신한다.
package com.firewatch.backend.repository

import org.springframework.jdbc.core.JdbcTemplate
import tools.jackson.databind.json.JsonMapper
import java.sql.Date

/** Called inside the catalog startup transaction after missing companies are inserted. */
internal class DirectoryCatalogRefresh(private val jdbc: JdbcTemplate) {
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    private val columns = listOf("name", "normalized_name", "search_text", "metadata_json", "asset_class", "region", "sector_id", "underlying_index", "verified_at")
    data class Result(val baselined: Int, val updated: Int, val preserved: Int)
    private data class Change(val symbol: String, val item: CatalogItem, val old: CatalogItem?, val baseline: String?)

    fun apply(directory: List<CatalogItem>, curatedSymbols: Set<String>): Result {
        val stored = jdbc.queryForList("SELECT * FROM instrument_catalog").associateBy { it["symbol"].toString() }
        val baselines = mutableListOf<Change>()
        val updates = mutableListOf<Change>()
        var preserved = 0
        for (item in directory) {
            if (item.symbol in curatedSymbols) continue
            val row = stored[item.symbol] ?: continue
            val raw = row["directory_baseline_json"]?.toString()
            val old = raw?.let { runCatching { mapper.readValue(it, CatalogItem::class.java) }.getOrNull() }
            if (raw == null && matches(row, item)) baselines += Change(item.symbol, item, null, null)
            else if (old != null && old.symbol == item.symbol && item.verifiedAt > old.verifiedAt && matches(row, old)) {
                updates += Change(item.symbol, item, old, raw)
            } else if (old == null || !matches(row, old) || (item.verifiedAt == old.verifiedAt && item != old)) preserved++
        }
        val guard = columns.joinToString(" AND ") { "$it=?" }
        val based = batch("UPDATE instrument_catalog SET directory_baseline_json=? WHERE symbol=? AND directory_baseline_json IS NULL AND $guard", baselines) { change ->
            listOf(mapper.writeValueAsString(change.item), change.symbol) + values(change.item)
        }
        val changed = batch("UPDATE instrument_catalog SET ${columns.joinToString(",") { "$it=?" }}, directory_baseline_json=? WHERE symbol=? AND directory_baseline_json=? AND $guard", updates) { change ->
            values(change.item) + listOf(mapper.writeValueAsString(change.item), change.symbol, change.baseline!!) + values(change.old!!)
        }
        return Result(based, changed, preserved + baselines.size - based + updates.size - changed)
    }

    private fun values(item: CatalogItem): List<Any> = listOf(item.name, InstrumentCatalog.normalize(item.name),
        listOf(item.name, item.symbol, item.description).joinToString(" ") { InstrumentCatalog.normalize(it) },
        mapper.writeValueAsString(item), item.assetClass, item.region, item.sectorId, item.underlyingIndex, Date.valueOf(item.verifiedAt))

    private fun matches(row: Map<String, Any?>, item: CatalogItem): Boolean = columns.zip(values(item)).all { (column, value) -> row[column]?.toString() == value.toString() }

    private fun batch(sql: String, changes: List<Change>, arguments: (Change) -> List<Any>): Int {
        if (changes.isEmpty()) return 0
        return jdbc.batchUpdate(sql, changes, 250) { statement, change ->
            arguments(change).forEachIndexed { index, value -> statement.setObject(index + 1, value) }
        }.sumOf { counts -> counts.count { it > 0 || it == java.sql.Statement.SUCCESS_NO_INFO } }
    }
}
