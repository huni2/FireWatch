package com.firewatch.backend.service

import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.recommendedStocks
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GameSimulationHistoryTest {
    @Test
    fun `single asset and compact histories preserve both frozen versions and every past price`() {
        for (version in listOf(1, 2)) for (seed in listOf(0L, 42L, -991L)) {
            val simulation = GameSimulation.forVersion(version)
            for (turn in 0..23) {
                val full = simulation.histories(seed, turn)
                assertEquals(full.map { it.copy(points = it.points.takeLast(2)) }, simulation.histories(seed, turn, 2))
                for (expected in full) assertEquals(expected, simulation.history(seed, turn, expected.instrumentType, expected.symbol))
            }
            assertEquals(null, simulation.history(seed, 23, GameInstrumentType.STOCK, "NOT-IN-GAME"))
            assertEquals(null, simulation.history(seed, 23, GameInstrumentType.GOLD, "unexpected"))
        }
    }

    @Test
    fun `expanded companies keep their own fictional history pick and sector rules`() {
        val frozen = javaClass.getResource("/game-universe-v2.json")!!.readText().replace("\r\n", "\n")
        val digest = java.security.MessageDigest.getInstance("SHA-256").digest(frozen.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        assertEquals("44e70aae03971d5bb89a6d3e1b7a0d6e61485cc7b08ca11e45e6f90b826f81a4", digest)
        val simulation = GameSimulation.forVersion(2)
        assertEquals(26, simulation.assets.size)
        assertEquals(26, simulation.metadata.map { it.symbol }.distinct().size)
        assertTrue(simulation.metadata.all { it.source?.startsWith("https://") == true && !it.verifiedAt.isNullOrBlank() })
        for (seed in listOf(0L, 42L, -991L)) {
            for (history in simulation.histories(seed, 23)) for (point in history.points) {
                assertEquals(simulation.price(seed, point.turnIndex, history.instrumentType, history.symbol), point.price)
            }
            for (turn in 0..23) {
                val picks = simulation.picks(seed, turn)
                assertEquals(picks.map { it.name }, simulation.briefing(seed, turn, simulation.dates(seed)[turn]).recommendedStocks())
                assertTrue(picks.all { simulation.price(seed, turn, GameInstrumentType.STOCK, it.symbol) != null })
                for (asset in simulation.assets) {
                    if (turn > 0) {
                        val driver = simulation.driver(seed, turn, GameInstrumentType.STOCK, asset.symbol)
                        val previous = simulation.price(seed, turn - 1, GameInstrumentType.STOCK, asset.symbol)!!.toDouble()
                        val current = simulation.price(seed, turn, GameInstrumentType.STOCK, asset.symbol)!!.toDouble()
                        assertTrue(kotlin.math.abs((current / previous - 1) * 100 - driver.marketPercent - driver.sectorPercent - driver.assetPercent) < .001)
                    }
                }
            }
        }
        assertEquals(null, simulation.price(42L, 0, GameInstrumentType.STOCK, "AURA"))
        assertEquals(null, GameSimulation.price(42L, 0, GameInstrumentType.STOCK, "035720.KS"))
    }

    @Test
    fun `expanded maximum history payload and calculation are bounded and measured`() {
        val simulation = GameSimulation.forVersion(2)
        repeat(30) { simulation.histories(42L, 23) }
        val timings = (0 until 100).map {
            val start = System.nanoTime()
            simulation.histories(42L, 23)
            (System.nanoTime() - start) / 1_000_000.0
        }.sorted()
        val histories = simulation.histories(42L, 23)
        val bytes = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build().writeValueAsBytes(histories).size
        assertEquals(34, histories.size)
        assertTrue(histories.all { it.points.size == 24 })
        assertTrue(bytes < 50000)
        println("26-company history local calculation median=${timings[50]}ms p95=${timings[95]}ms JSON=$bytes bytes; not Render HTTP latency")
    }
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
