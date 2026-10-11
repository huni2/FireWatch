// 주간 사건의 가격 근거·연속 날짜·과거 가격 재현·전체 기업 규모와 계산 비용을 확인한다.
package com.firewatch.backend.service

import com.firewatch.backend.entity.GameInstrumentType
import org.junit.jupiter.api.Test
import kotlin.test.*

class WeeklyGameSimulationTest {
    private val rules = GameSimulation.forVersion(3)
    @Test fun `weekly stories preserve known prices and explain every bounded move without future history`() {
        assertEquals(60, rules.assets.size)
        assertEquals(12, rules.assets.map { it.sector }.distinct().size)
        for (seed in listOf(0L, 42L, -991L, Long.MAX_VALUE)) {
            val dates = rules.dates(seed)
            assertEquals(24, dates.size)
            assertTrue(dates.zipWithNext().all { (a, b) -> a.plusWeeks(1) == b })
            val histories = rules.histories(seed, 23)
            assertEquals(68, histories.size)
            val news = (0..23).map { rules.news(seed, it) }
            for (turn in 0..23) {
                assertEquals(16, news[turn].size)
                assertTrue(news[turn].all { it.link.isEmpty() && it.title.startsWith("[가상 뉴스]") })
                assertTrue(rules.events(seed, turn).isEmpty())
                val picks = rules.picks(seed, turn)
                assertEquals(3, picks.map { it.symbol }.distinct().size)
                assertTrue(picks.all { pick -> news[turn].any { it.title == pick.newsTitle } && pick.reason.isNotBlank() && pick.risk.isNotBlank() })
                val partial = rules.histories(seed, turn, 2)
                for (full in histories) {
                    val visible = partial.first { it.instrumentType == full.instrumentType && it.symbol == full.symbol }
                    assertEquals(full.points.take(turn + 1).takeLast(2), visible.points)
                    val price = rules.price(seed, turn, full.instrumentType, full.symbol)!!
                    assertEquals(full.points[turn].price, price)
                    assertTrue(price.signum() > 0)
                    val d = rules.driver(seed, turn, full.instrumentType, full.symbol)
                    assertTrue(news[turn].any { it.title == d.newsTitle })
                    if (turn > 0) {
                        val change = (price.toDouble() / full.points[turn - 1].price.toDouble() - 1) * 100
                        assertTrue(kotlin.math.abs(change) < 4.1, "unexplained jump: $change")
                        assertTrue(kotlin.math.abs(change - d.marketPercent - d.sectorPercent - d.assetPercent) < .001)
                    }
                }
            }
            // Similar industries share a story but do not share identical price paths.
            val chipSymbols = rules.assets.filter { it.sector == "반도체·AI 인프라" }.map { it.symbol }
            assertTrue(chipSymbols.map { rules.driver(seed, 5, GameInstrumentType.STOCK, it).assetPercent }.distinct().size > 1)
        }
        assertNull(rules.price(42, 1, GameInstrumentType.STOCK, "NOT-IN-GAME"))
    }
    @Test fun `weekly universe computation and payload are measured separately from server latency`() {
        repeat(10) { rules.histories(42, 23) }
        val timings = (0 until 40).map {
            val start = System.nanoTime(); rules.histories(42, 23); (System.nanoTime() - start) / 1_000_000.0
        }.sorted()
        val mapper = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()
        val full = mapper.writeValueAsBytes(rules.histories(42, 23)).size
        val compact = mapper.writeValueAsBytes(rules.histories(42, 23, 2)).size
        assertTrue(full < 100000 && compact < 20000)
        println("WeeklyUniverse: companies=60 sectors=12 history_full_bytes=$full history_compact_bytes=$compact local_median_ms=${timings[20]} local_p95_ms=${timings[38]}; not Render latency")
    }
}
