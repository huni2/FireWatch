package com.firewatch.backend.web

import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.client.StockSearchResult
import com.firewatch.backend.service.RecommendedStockPerformance
import com.firewatch.backend.service.RecommendedStockPerformanceService
import com.firewatch.backend.service.StockService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

// Design Ref: 2026-08-21 사용자 요청 — 종목 시세/검색, 조회 전용이라 API 키 불필요.
// range: 1d(오늘 분봉)|1wk|1mo|3mo|6mo(기본)|5y
@RestController
@RequestMapping("/api/stocks")
class StockController(
    private val stockService: StockService,
    private val recommendedStockPerformanceService: RecommendedStockPerformanceService,
) {
    @GetMapping("/{symbol}/history")
    suspend fun history(
        @PathVariable symbol: String,
        @RequestParam(defaultValue = "6mo") range: String,
    ): StockPriceHistory = withContext(Dispatchers.IO) {
        stockService.fetchPriceHistory(symbol, parseRange(range))
    }

    @GetMapping("/search")
    suspend fun search(@RequestParam q: String): List<StockSearchResult> =
        withContext(Dispatchers.IO) { stockService.search(q) }

    // Design Ref: BE-13 — 지금까지 AI가 추천한 종목들이 그 시점 가격 대비 현재 얼마나 올랐는지.
    @GetMapping("/recommendations/performance")
    suspend fun recommendationsPerformance(): List<RecommendedStockPerformance> =
        withContext(Dispatchers.IO) { recommendedStockPerformanceService.fetchPerformance() }

    private fun parseRange(value: String): StockRange = when (value) {
        "1d" -> StockRange.DAY
        "1wk" -> StockRange.WEEK
        "1mo" -> StockRange.MONTH
        "3mo" -> StockRange.THREE_MONTH
        "5y" -> StockRange.FIVE_YEAR
        else -> StockRange.SIX_MONTH
    }
}
