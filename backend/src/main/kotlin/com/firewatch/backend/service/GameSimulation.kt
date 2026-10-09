package com.firewatch.backend.service

import com.firewatch.backend.entity.*
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.util.Random

data class VirtualGameAsset(val symbol: String, val name: String, val sector: String, val basePrice: Int)
data class GameMarketEvent(val code: String, val title: String, val description: String, val blockedAssets: List<String>)
data class GamePriceHistoryPoint(val turnIndex: Int, val price: BigDecimal)
data class GameAssetHistory(val instrumentType: GameInstrumentType, val symbol: String?, val name: String, val points: List<GamePriceHistoryPoint>)
data class GamePick(val symbol: String, val name: String, val reason: String, val risk: String, val newsTitle: String)
data class GamePriceDriver(val instrumentType: GameInstrumentType, val symbol: String?, val scenario: String, val newsTitle: String, val marketPercent: Double, val sectorPercent: Double, val assetPercent: Double, val halted: Boolean)

/** Deterministic fiction. Never calls a financial, news or generative AI provider. */
private val legacyGameAssets = listOf(
        VirtualGameAsset("AURA", "오로라 반도체", "반도체", 24000),
        VirtualGameAsset("NEO", "네오 모빌리티", "모빌리티", 18000),
        VirtualGameAsset("SOLAR", "솔라 에너지", "에너지", 12000),
        VirtualGameAsset("LUMEN", "루멘 헬스", "헬스케어", 32000),
        VirtualGameAsset("NEXUS", "넥서스 클라우드", "클라우드", 46000),
    )

object GameSimulation : GameSimulationRules(1, legacyGameAssets) {
    const val CURRENT_VERSION = 2
    private val expanded by lazy {
        val root = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()
            .readValue(GameSimulation::class.java.getResourceAsStream("/game-universe-v2.json")!!, Array<GameUniverseDefinition>::class.java).toList()
        val metadata = root.map { GameAssetMetadata(it.symbol,it.name,it.sector,it.aliases,it.source,it.verifiedAt) }
        val assets = root.map { VirtualGameAsset(it.symbol,it.name,it.sector,it.basePrice) }
        require(assets.size == 26 && assets.map { it.symbol }.distinct().size == 26 && assets.all { it.basePrice > 0 })
        GameSimulationRules(2, assets, metadata)
    }
    fun forVersion(version: Int): GameSimulationRules = when(version) {
        1 -> this
        2 -> expanded
        else -> throw com.firewatch.backend.web.ValidationException("이 게임의 규칙 버전을 지원하지 않습니다. 기록을 유지한 채 운영자에게 문의해주세요.", emptyMap())
    }
}

private data class GameUniverseDefinition(val symbol: String, val name: String, val sector: String, val sectorId: String, val aliases: List<String>, val source: String, val verifiedAt: String, val basePrice: Int)

data class GameAssetMetadata(val symbol: String, val name: String, val sector: String, val aliases: List<String> = emptyList(), val source: String? = null, val verifiedAt: String? = null)

open class GameSimulationRules(val version: Int, val assets: List<VirtualGameAsset>, val metadata: List<GameAssetMetadata> = assets.map { GameAssetMetadata(it.symbol,it.name,it.sector) }) {
    fun histories(seed: Long, currentTurn: Int): List<GameAssetHistory> {
        val targets = assets.map { Triple(GameInstrumentType.STOCK, it.symbol, it.name) } + listOf(
            Triple(GameInstrumentType.KOSPI, null, "코스피"), Triple(GameInstrumentType.KOSDAQ, null, "코스닥"),
            Triple(GameInstrumentType.SP500, null, "S&P 500"), Triple(GameInstrumentType.NASDAQ, null, "나스닥"),
            Triple(GameInstrumentType.DOW, null, "다우"), Triple(GameInstrumentType.GOLD, null, "금"),
            Triple(GameInstrumentType.SILVER, null, "은"), Triple(GameInstrumentType.USD, null, "달러"),
        )
        return targets.map { (type, symbol, name) ->
            // Accumulate the unrounded path once. Rounding each displayed point must not
            // change subsequent prices or the value of an existing saved game.
            var value = basePrice(type, symbol)!!.toDouble()
            val points = (0..currentTurn.coerceIn(0, 23)).map { index ->
                if (index > 0) value = advancePrice(seed, index, type, symbol, value)
                GamePriceHistoryPoint(index, roundedPrice(value))
            }
            GameAssetHistory(type, symbol, name, points)
        }
    }
    private val assetsBySymbol = assets.associateBy { it.symbol }
    private val scenarios = listOf(
        Triple("성장 기대", "가상 중앙은행, 금리 인하 검토…성장주에 기대감", 0.025),
        Triple("위험 회피", "가상 물가 지표 예상 상회…투자자들은 방어 자산으로 이동", -0.035),
        Triple("기술주 강세", if (version == 1) "오로라 반도체와 넥서스 클라우드, 가상 대형 계약 발표" else "게임 속 기술 업종의 가상 수요 증가…반도체·소프트웨어에 기대감", 0.018),
        Triple("에너지 전환", if (version == 1) "솔라 에너지, 가상 차세대 발전 프로젝트 수주" else "게임 속 에너지 저장 투자 확대…가상 배터리 수요 증가", 0.008),
        Triple("실적 경계", "가상 기업 실적 발표를 앞두고 시장의 관망세 확대", -0.012),
        Triple("회복 신호", "가상 소비·고용 지표 개선…경기 회복에 무게", 0.015),
    )
    private fun isTechnology(symbol: String?) = if (version == 1) symbol in listOf("AURA", "NEXUS") else assetsBySymbol[symbol]?.sector in listOf("반도체·AI 인프라", "플랫폼·소프트웨어")
    private fun isEnergy(symbol: String?) = if (version == 1) symbol == "SOLAR" else assetsBySymbol[symbol]?.sector == "배터리·에너지 저장"
    private fun random(seed: Long, turn: Int) = Random(seed xor (turn.toLong() * 7919L + 104729L))
    private fun scenario(seed: Long, turn: Int) = scenarios[random(seed, turn).nextInt(scenarios.size)]
    fun dates(seed: Long): List<LocalDate> = (0 until 24).map { LocalDate.of(2030, 1, 1).plusDays(random(seed, it).nextInt(365).toLong()) }
    // A one-turn game rule, not a reproduction of exchange regulations. Index orders pause
    // during a sidecar; an individual halt preserves that stock's last valuation price.
    fun events(seed: Long, turn: Int): List<GameMarketEvent> {
        if (turn == 0) return emptyList()
        val roll = Random(seed xor (turn.toLong() * 31337L)).nextInt(12)
        return when (roll) {
            0 -> listOf(GameMarketEvent("SIDECAR", "가상 사이드카", "게임 규칙에 따라 지수 자산 주문이 이번 턴 동안 중단됩니다. 개별 종목·금·은·달러는 거래할 수 있고 다음 턴에 제한이 해제됩니다.", listOf("KOSPI", "KOSDAQ", "SP500", "NASDAQ", "DOW")))
            1 -> {
                val asset = assets[Random(seed xor turn.toLong()).nextInt(assets.size)]
                listOf(GameMarketEvent("TRADING_HALT", "${asset.name} 가상 거래정지", "가상 공시 확인으로 ${asset.name}의 매매가 이번 턴 동안 정지됩니다. 평가에는 직전 턴 가격을 유지하며 다음 턴에 이 제한이 해제됩니다.", listOf("STOCK:${asset.symbol}")))
            }
            else -> emptyList()
        }
    }
    fun blockedReason(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?): String? =
        events(seed, turn).firstOrNull { (if (type == GameInstrumentType.STOCK) "STOCK:$symbol" else type.name) in it.blockedAssets }?.description
    fun driver(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?): GamePriceDriver {
        val event = scenario(seed, turn)
        val halted = type == GameInstrumentType.STOCK && blockedReason(seed, turn, type, symbol) != null
        val exposure = when (type) { GameInstrumentType.GOLD -> -.6; GameInstrumentType.USD -> -.25; GameInstrumentType.SILVER -> -.2; else -> 1.0 }
        val sector = if (type == GameInstrumentType.STOCK && ((event.first == "기술주 강세" && isTechnology(symbol)) || (event.first == "에너지 전환" && isEnergy(symbol)))) .04 else 0.0
        val noise = Random(seed xor (turn.toLong() * 65537L) xor (symbol ?: type.name).hashCode().toLong()).nextDouble() * .04 - .02
        return GamePriceDriver(type, symbol, event.first, "[가상 뉴스] ${event.second}", if (halted || turn == 0) 0.0 else event.third * exposure * 100, if (halted || turn == 0) 0.0 else sector * 100, if (halted || turn == 0) 0.0 else noise * 100, halted)
    }
    fun moveReason(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?): String {
        val d = driver(seed, turn, type, symbol)
        return if (d.halted) "가상 거래정지로 직전 평가 가격을 유지했습니다."
        else "${d.scenario}: 시장 ${"%.2f".format(java.util.Locale.ROOT, d.marketPercent)}%, 업종 ${"%.2f".format(java.util.Locale.ROOT, d.sectorPercent)}%, 자산별 변동 ${"%.2f".format(java.util.Locale.ROOT, d.assetPercent)}%를 반영했습니다."
    }
    private fun pickSymbols(seed: Long, turn: Int): List<String> = when (scenario(seed, turn).first) {
        "기술주 강세" -> if (version == 1) listOf("AURA", "NEXUS") else assets.filter { isTechnology(it.symbol) }.shuffled(kotlin.random.Random(seed xor turn.toLong())).take(2).map { it.symbol }; "에너지 전환" -> if (version == 1) listOf("SOLAR", "LUMEN") else assets.filter { isEnergy(it.symbol) }.map { it.symbol }
        else -> assets.shuffled(kotlin.random.Random(seed xor turn.toLong())).take(2).map { it.symbol }
    }
    fun picks(seed: Long, turn: Int): List<GamePick> = pickSymbols(seed, turn).map { symbol ->
        val asset = assets.first { it.symbol == symbol }; val event = scenario(seed, turn)
        val reason = when {
            event.first == "기술주 강세" -> if (version == 1) "가상 대형 계약 뉴스의 당사자이며 이번 시나리오의 업종 영향을 받는 관찰 후보입니다." else "게임 속 기술 업종 수요 시나리오의 영향을 받는 비교 후보입니다. 실제 기업 소식이나 상승 예측이 아닙니다."
            event.first == "에너지 전환" && isEnergy(symbol) -> if (version == 1) "가상 발전 프로젝트 수주 뉴스의 당사자로 에너지 업종 영향을 확인하는 후보입니다." else "게임 속 배터리 수요 시나리오의 영향을 확인하는 후보입니다. 실제 기업 계약이나 투자 추천이 아닙니다."
            event.first == "에너지 전환" -> "에너지 뉴스의 직접 수혜 기업은 아닙니다. 다른 업종과 가격 흐름을 비교하도록 함께 선택한 후보입니다."
            else -> "${event.first} 뉴스 속에서 ${asset.sector} 업종을 비교하도록 시드 기반으로 선택한 관찰 후보입니다. 상승 확률 순위는 아닙니다."
        }
        GamePick(symbol, asset.name, reason, blockedReason(seed, turn, GameInstrumentType.STOCK, symbol) ?: "다음 턴은 새 시나리오입니다. 시장 방향과 자산별 변동으로 하락할 수 있으며 픽이 상승을 보장하지 않습니다.", "[가상 뉴스] ${event.second}")
    }
    private fun basePrice(type: GameInstrumentType, symbol: String?): Int? = when (type) {
            GameInstrumentType.STOCK -> assetsBySymbol[symbol]?.basePrice
            GameInstrumentType.KOSPI -> 3000; GameInstrumentType.KOSDAQ -> 900; GameInstrumentType.SP500 -> 6000
            GameInstrumentType.NASDAQ -> 18000; GameInstrumentType.DOW -> 42000
            GameInstrumentType.GOLD -> 2500; GameInstrumentType.SILVER -> 30; GameInstrumentType.USD -> 1300
    }

    private fun roundedPrice(value: Double) = BigDecimal.valueOf(value.coerceAtLeast(.01)).setScale(4, RoundingMode.HALF_UP)
    private fun advancePrice(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?, value: Double): Double {
        if (type == GameInstrumentType.STOCK && blockedReason(seed, turn, type, symbol) != null) return value
        val event = scenario(seed, turn)
        val noise = Random(seed xor (turn.toLong() * 65537L) xor (symbol ?: type.name).hashCode().toLong()).nextDouble() * .04 - .02
        val exposure = when (type) { GameInstrumentType.GOLD -> -.6; GameInstrumentType.USD -> -.25; GameInstrumentType.SILVER -> -.2; else -> 1.0 }
        val sector = if (type == GameInstrumentType.STOCK && ((event.first == "기술주 강세" && isTechnology(symbol)) || (event.first == "에너지 전환" && isEnergy(symbol)))) .04 else 0.0
        return value * (1 + event.third * exposure + noise + sector)
    }
    fun price(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?): BigDecimal? {
        var value = basePrice(type, symbol)?.toDouble() ?: return null
        for (index in 1..turn) value = advancePrice(seed, index, type, symbol, value)
        return roundedPrice(value)
    }
    fun briefing(seed: Long, turn: Int, date: LocalDate): Briefing {
        val event = scenario(seed, turn)
        val picks = pickSymbols(seed, turn)
        return Briefing(id = -1, briefingDate = date, marketSummary = "[가상 시나리오: ${event.first}] ${event.second}. 모든 지표·가격·뉴스·픽은 게임용으로 생성되었습니다.", recommendedStocksRaw = picks.joinToString(",") { ticker -> assets.first { it.symbol == ticker }.name }, goldPrice = price(seed, turn, GameInstrumentType.GOLD, null), silverPrice = price(seed, turn, GameInstrumentType.SILVER, null), usdKrw = price(seed, turn, GameInstrumentType.USD, null), kospi = price(seed, turn, GameInstrumentType.KOSPI, null), kosdaq = price(seed, turn, GameInstrumentType.KOSDAQ, null), sp500 = price(seed, turn, GameInstrumentType.SP500, null), nasdaq = price(seed, turn, GameInstrumentType.NASDAQ, null), dow = price(seed, turn, GameInstrumentType.DOW, null), dataSourceStatus = DataSourceStatus.NORMAL)
    }
    fun news(seed: Long, turn: Int) = listOf(NewsArticle(briefingId = -1, title = "[가상 뉴스] ${scenario(seed, turn).second}", link = "", description = "게임 시나리오에 따른 허구의 사건입니다. 가격은 시장 방향·업종 영향·자산별 변동을 함께 반영합니다.")) + events(seed, turn).map { NewsArticle(briefingId = -1, title = "[가상 뉴스] ${it.title}", link = "", description = it.description) }
}
