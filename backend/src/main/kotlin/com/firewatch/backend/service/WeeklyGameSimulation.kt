// 주간 가상 시장의 사건·뉴스·가격 근거를 같은 규칙에서 만들고 과거 결과를 재현한다.
package com.firewatch.backend.service

import com.firewatch.backend.entity.*
import java.time.LocalDate
import java.util.Random
import kotlin.math.sin

class WeeklyGameSimulation(assets: List<VirtualGameAsset>, metadata: List<GameAssetMetadata>) : GameSimulationRules(3, assets, metadata) {
    private val companies = assets.associateBy { it.symbol }
    private val sectors = assets.map { it.sector }.distinct()
    private val phases = listOf("기대가 모이는 시기", "진행 상황을 확인하는 시기", "비용을 살펴보는 시기", "결과를 확인하는 시기")
    private val themes = mapOf(
        "반도체·AI 인프라" to "설비 투자와 반도체 주문", "플랫폼·소프트웨어" to "서비스 이용과 구독 수요",
        "자동차·모빌리티" to "자동차 판매와 부품 주문", "배터리·에너지 저장" to "배터리 주문과 원재료 비용",
        "금융" to "대출 수요와 자금 조달 비용", "바이오·헬스케어" to "연구 일정과 의약품 수요",
        "방산·항공우주" to "장기 계약과 납품 일정", "유통·소비" to "소비 지출과 매장 운영 비용",
        "식품·생활" to "제품 판매와 식재료 비용", "통신·미디어" to "가입자 수와 콘텐츠 투자",
        "산업재·건설" to "설비 주문과 공사 일정", "에너지·공공서비스" to "에너지 수요와 연료 비용",
    )
    private fun signal(seed: Long, block: Int, key: String) =
        Random(seed xor (block.toLong() * 104729L) xor (key.hashCode().toLong() * 7919L)).nextDouble() * 2 - 1
    private fun phase(turn: Int) = turn.coerceIn(0, 23) % 4
    // Two-week transitions keep a new four-week episode from abruptly reversing the previous one.
    private fun trend(seed: Long, turn: Int, key: String): Double {
        val block = turn / 4
        val current = signal(seed, block, key)
        val previous = if (block == 0) current else signal(seed, block - 1, key)
        val weight = listOf(.35, .7, 1.0, 1.0)[phase(turn)]
        return previous * (1 - weight) + current * weight
    }
    private fun sectorTitle(seed: Long, turn: Int, sector: String): String {
        val outlook = if (signal(seed, turn / 4, sector) >= 0) "수요 개선 흐름" else "수요 둔화 흐름"
        return "[가상 뉴스][$sector] $outlook · ${phases[phase(turn)]}"
    }
    private fun sectorDescription(turn: Int, sector: String): String {
        val subject = themes[sector] ?: "수요와 운영 비용"
        val progress = listOf("관련 기대가 생기고 있어요. 실제 진행 상황은 더 지켜봐야 해요.",
            "진행 상황이 조금씩 드러나고 있어요. 기업마다 영향을 받는 정도는 달라요.",
            "수요뿐 아니라 비용 부담도 함께 살펴볼 시기예요.",
            "이번 이야기의 결과를 확인하고 있어요. 다음 이야기가 같은 방향으로 이어진다고 보장할 수는 없어요.")[phase(turn)]
        return "$subject 이야기가 이어지고 있어요. $progress 실제 기업의 소식이 아닌 게임용 사건이에요."
    }
    private fun marketTitle(seed: Long, turn: Int) =
        "[가상 뉴스][시장] " + if (trend(seed, turn, "market") >= 0) "소비·투자 기대가 조금씩 개선되고 있어요" else "소비·투자 기대가 잠시 주춤하고 있어요"
    override fun dates(seed: Long): List<LocalDate> {
        val start = LocalDate.of(2030, 1, 7).plusWeeks(Math.floorMod(seed, 12L))
        // Week 1 is the initial quote; 23 weekly advances produce 24 observation dates.
        return (0 until 24).map { start.plusWeeks(it.toLong()) }
    }
    // Intraday sidecars are not represented as week-long restrictions. Frozen older games retain them.
    override fun events(seed: Long, turn: Int): List<GameMarketEvent> = emptyList()
    override fun driver(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?): GamePriceDriver {
        val company = companies[symbol]
        val exposure = when (type) { GameInstrumentType.GOLD -> -.5; GameInstrumentType.USD -> -.2; GameInstrumentType.SILVER -> .3; else -> 1.0 }
        val sensitivity = .65 + (Math.floorMod((symbol ?: type.name).hashCode(), 71)) / 100.0
        val market = trend(seed, turn, "market") * .9 * exposure * sensitivity
        val sector = if (company != null && type == GameInstrumentType.STOCK) trend(seed, turn, company.sector) * 1.5 * sensitivity else 0.0
        val individual = trend(seed, turn, symbol ?: type.name) * .55 + sin((turn + sensitivity) * .65) * .2
        return GamePriceDriver(type, symbol, phases[phase(turn)],
            if (company != null) sectorTitle(seed, turn, company.sector) else marketTitle(seed, turn),
            if (turn == 0) 0.0 else market, if (turn == 0) 0.0 else sector, if (turn == 0) 0.0 else individual, false)
    }
    override fun moveReason(seed: Long, turn: Int, type: GameInstrumentType, symbol: String?): String {
        val d = driver(seed, turn, type, symbol)
        fun percent(value: Double) = "%.2f".format(java.util.Locale.ROOT, value)
        return "${d.newsTitle} 흐름을 반영했어요. 시장 ${percent(d.marketPercent)}%p · 분야 ${percent(d.sectorPercent)}%p · 기업·자산 특성 ${percent(d.assetPercent)}%p가 이번 주 가격 변화에 더해졌어요."
    }
    private fun candidates(seed: Long, turn: Int): List<VirtualGameAsset> {
        // Use only the current public sector story, never next week's prices or company signal.
        val observed = sectors.sortedByDescending { trend(seed, turn, it) }.take(3)
        return observed.map { sector ->
            val choices = assets.filter { it.sector == sector }
            choices[Math.floorMod(seed xor (turn / 4).toLong() xor sector.hashCode().toLong(), choices.size.toLong()).toInt()]
        }
    }
    override fun picks(seed: Long, turn: Int): List<GamePick> = candidates(seed, turn).map { asset ->
        GamePick(asset.symbol, asset.name, "${asset.sector} 분야의 ${themes[asset.sector]} 흐름을 함께 살펴볼 만한 기업이에요. 같은 분야의 다른 기업과도 비교해보세요.",
            "기대와 실제 결과는 다를 수 있어요. 다음 주에는 흐름이 달라지거나 가격이 내려갈 수 있어요. 상승을 보장하는 추천은 아니에요.", sectorTitle(seed, turn, asset.sector))
    }
    override fun briefing(seed: Long, turn: Int, date: LocalDate): Briefing = super.briefing(seed, turn, date).also {
        it.marketSummary = "${turn + 1}주째 · ${marketTitle(seed, turn)}. 분야별 이야기를 살펴보고 이번 주 선택을 정해보세요. 거래하지 않고 지켜봐도 괜찮아요. 가격·뉴스·픽은 모두 가상이에요."
        it.recommendedStocksRaw = candidates(seed, turn).joinToString(",") { asset -> asset.name }
    }
    override fun news(seed: Long, turn: Int): List<NewsArticle> =
        listOf(NewsArticle(briefingId = -1, title = marketTitle(seed, turn), link = "", description = "소비와 투자 기대가 몇 주에 걸쳐 이어지는 가상 시장이에요. 분야와 기업마다 반응이 다를 수 있어요.")) +
            sectors.map { sector -> NewsArticle(briefingId = -1, title = sectorTitle(seed, turn, sector), link = "", description = sectorDescription(turn, sector)) } +
            candidates(seed, turn).map { asset -> NewsArticle(briefingId = -1, title = "[가상 뉴스][${asset.sector}] ${asset.name} · 이번 주 살펴볼 점",
                link = "", description = "게임 속 ${asset.name}의 ${themes[asset.sector]} 흐름을 살펴보세요. ${sectorDescription(turn, asset.sector)} 실제 기업의 공시·실적과 관계없는 가상 이야기예요.") }
}
