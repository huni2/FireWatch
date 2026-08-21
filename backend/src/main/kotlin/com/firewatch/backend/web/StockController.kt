package com.firewatch.backend.web

import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.service.StockService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

// Design Ref: 2026-08-21 사용자 요청 — GET /api/stocks/{symbol}/history, 조회 전용이라 API 키 불필요.
@RestController
@RequestMapping("/api/stocks")
class StockController(
    private val stockService: StockService,
) {
    @GetMapping("/{symbol}/history")
    suspend fun history(@PathVariable symbol: String): StockPriceHistory =
        withContext(Dispatchers.IO) { stockService.fetchPriceHistory(symbol) }
}
