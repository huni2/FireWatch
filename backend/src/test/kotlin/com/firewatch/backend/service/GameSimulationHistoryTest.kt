package com.firewatch.backend.service

import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.recommendedStocks
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GameSimulationHistoryTest {
    @Test
    fun `version one output matches the frozen pre expansion rules`() {
        val output = buildString {
            appendLine(GameSimulation.assets)
            for (seed in listOf(0L, 42L, 314159L, Long.MAX_VALUE, -991L)) {
                val dates = GameSimulation.dates(seed)
                appendLine(dates)
                appendLine(GameSimulation.histories(seed, 23))
                for (turn in 0..23) {
                    appendLine(GameSimulation.events(seed, turn))
                    appendLine(GameSimulation.picks(seed, turn))
                    appendLine(GameSimulation.briefing(seed, turn, dates[turn]).marketSummary)
                    appendLine(GameSimulation.news(seed, turn).map { it.title to it.description })
                    for (history in GameSimulation.histories(seed, 0)) {
                        appendLine(GameSimulation.price(seed, turn, history.instrumentType, history.symbol))
                        appendLine(GameSimulation.driver(seed, turn, history.instrumentType, history.symbol))
                        appendLine(GameSimulation.moveReason(seed, turn, history.instrumentType, history.symbol))
                    }
                }
            }
        }
        val digest = java.security.MessageDigest.getInstance("SHA-256")
            .digest(output.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
        assertEquals("41bf972c8a5b97ced825d9088526cd4fc853f88edaa1b34b6a541e365c68554b", digest)
    }
    @Test
    fun `incremental histories preserve every independently valued turn across seeds`() {
        for (seed in listOf(0L, 42L, 314159L, Long.MAX_VALUE, -991L)) {
            val histories = GameSimulation.histories(seed, 23)
            for (history in histories) for (point in history.points) {
                assertEquals(GameSimulation.price(seed, point.turnIndex, history.instrumentType, history.symbol), point.price,
                    "seed=$seed ${history.name} turn=${point.turnIndex}")
            }
        }
    }
    @Test
    fun `pick explanations use the same scenario shortlist and provided virtual news`() {
        for (turn in 0..23) {
            val picks = GameSimulation.picks(42L, turn)
            val briefing = GameSimulation.briefing(42L, turn, java.time.LocalDate.of(2030, 1, 1))
            assertEquals(briefing.recommendedStocks(), picks.map { it.name })
            assertTrue(picks.all { it.reason.isNotBlank() && it.risk.isNotBlank() })
            assertTrue(picks.all { pick -> GameSimulation.news(42L, turn).any { it.title == pick.newsTitle } })
        }
    }
    @Test
    fun `reported price drivers match actual movement including zero during halt`() {
        for (turn in 1..23) for (history in GameSimulation.histories(42L, 0)) {
            val d = GameSimulation.driver(42L, turn, history.instrumentType, history.symbol)
            val previous = GameSimulation.price(42L, turn - 1, history.instrumentType, history.symbol)!!.toDouble()
            val current = GameSimulation.price(42L, turn, history.instrumentType, history.symbol)!!.toDouble()
            val observedPercent = (current / previous - 1) * 100
            assertTrue(kotlin.math.abs(observedPercent - d.marketPercent - d.sectorPercent - d.assetPercent) < .001, "$turn ${history.name}")
            if (d.halted) assertEquals(previous, current)
        }
    }
    @Test
    fun `history is deterministic contains every tradable asset and never exposes future turns`() {
        val seed = 314159L
        val histories = GameSimulation.histories(seed, 4)
        assertEquals(histories, GameSimulation.histories(seed, 4))
        assertEquals(GameSimulation.assets.map { it.symbol }.toSet(), histories.filter { it.instrumentType == GameInstrumentType.STOCK }.map { it.symbol }.toSet())
        assertTrue(histories.all { it.points.map { p -> p.turnIndex } == (0..4).toList() })
        histories.forEach { history -> assertEquals(GameSimulation.price(seed, 4, history.instrumentType, history.symbol), history.points.last().price) }
        assertTrue(GameSimulation.histories(seed, 0).all { it.points.size == 1 })
    }
    @Test
    fun `halt history preserves previous price and remains identical after a later turn`() {
        val seed = 42L
        val haltedTurn = (1..23).first { GameSimulation.events(seed, it).any { event -> event.code == "TRADING_HALT" } }
        val symbol = GameSimulation.events(seed, haltedTurn).first().blockedAssets.first().removePrefix("STOCK:")
        val series = GameSimulation.histories(seed, haltedTurn).first { it.symbol == symbol }.points
        assertEquals(series[haltedTurn - 1].price, series.last().price)
        val laterSeries = GameSimulation.histories(seed, 23).first { it.symbol == symbol }.points
        assertEquals(series, laterSeries.take(series.size))
    }
}
