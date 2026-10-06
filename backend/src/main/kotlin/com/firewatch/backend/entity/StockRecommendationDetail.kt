package com.firewatch.backend.entity

import tools.jackson.databind.json.JsonMapper

data class StockRecommendationDetail(val stockName: String, val reason: String, val risk: String, val sourceNewsLinks: List<String> = emptyList())

private val recommendationMapper = JsonMapper.builder().findAndAddModules().build()
fun List<StockRecommendationDetail>.toRecommendationJson(): String = recommendationMapper.writeValueAsString(this)
fun Briefing.recommendationDetails(): List<StockRecommendationDetail> = runCatching {
    if (recommendationDetailsRaw.isNullOrBlank()) emptyList()
    else recommendationMapper.readValue(recommendationDetailsRaw, Array<StockRecommendationDetail>::class.java).toList()
        .filter { it.stockName in recommendedStocks() }.distinctBy { it.stockName }.take(10)
}.getOrDefault(emptyList())
