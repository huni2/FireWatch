package com.firewatch.backend.web

import com.firewatch.backend.client.StockInterval
import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.service.StockService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

// Design Ref: 2026-08-21 사용자 요청 — GET /api/stocks/{symbol}/history, 조회 전용이라 API 키 불필요.
// interval=1d(기본, 6개월 일봉) | interval=1m(오늘 1분봉 — 프론트가 주기적으로 재조회해 실시간처럼 표시).
@RestController
@RequestMapping("/api/stocks")
class StockController(
    private val stockService: StockService,
) {
    @GetMapping("/{symbol}/history")
    suspend fun history(
        @PathVariable symbol: String,
        @RequestParam(defaultValue = "1d") interval: String,
    ): StockPriceHistory = withContext(Dispatchers.IO) {
        val parsedInterval = if (interval == "1m") StockInterval.INTRADAY else StockInterval.DAILY
        stockService.fetchPriceHistory(symbol, parsedInterval)
    }
}
