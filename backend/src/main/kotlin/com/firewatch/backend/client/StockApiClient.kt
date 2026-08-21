package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset

data class StockPricePoint(val date: String, val close: BigDecimal)
data class StockPriceHistory(val symbol: String, val points: List<StockPricePoint>)

/**
 * [FinancialApiClient]와 같은 Yahoo Finance 비공식 v8 chart 엔드포인트를 임의 종목 티커로 재사용한다.
 * 국내 종목은 코스피 `005930.KS`/코스닥 `.KQ`, 해외는 `AAPL`처럼 티커 그대로 입력받는다(2026-08-21,
 * 사용자 요청 "원하는 종목과 특정 주식에 대한 차트도 보고싶은데").
 */
@Component
class StockApiClient(
    @Value("\${firewatch.yahoo.base-url}") yahooBaseUrl: String,
) {
    private val yahooClient = WebClient.builder()
        .baseUrl(yahooBaseUrl)
        .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; FireWatch/1.0)")
        .build()

    fun fetchPriceHistory(symbol: String): StockPriceHistory {
        val response = yahooClient.get()
            .uri("/v8/finance/chart/$symbol?interval=1d&range=6mo")
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("Yahoo Finance 응답이 비어 있음: $symbol")
        return parseHistory(response, symbol)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 15L

        @Suppress("UNCHECKED_CAST")
        internal fun parseHistory(response: Map<String, Any?>, symbol: String): StockPriceHistory {
            val chart = response["chart"] as? Map<String, Any?> ?: error("Yahoo 응답 형식 이상($symbol): chart 없음")
            val result = (chart["result"] as? List<Map<String, Any?>>)?.firstOrNull()
                ?: error("Yahoo 응답 형식 이상($symbol): result 없음")
            val timestamps = result["timestamp"] as? List<Number> ?: emptyList()
            val quote = ((result["indicators"] as? Map<String, Any?>)?.get("quote") as? List<Map<String, Any?>>)
                ?.firstOrNull()
            val closes = quote?.get("close") as? List<Number?> ?: emptyList()

            // 비거래일·데이터 결측 슬롯은 close가 null로 온다 — 그대로 걸러낸다.
            val points = timestamps.zip(closes).mapNotNull { (ts, close) ->
                close ?: return@mapNotNull null
                val date = Instant.ofEpochSecond(ts.toLong()).atZone(ZoneOffset.UTC).toLocalDate()
                StockPricePoint(date = date.toString(), close = BigDecimal(close.toString()))
            }
            check(points.isNotEmpty()) { "Yahoo 응답에 유효한 시세 포인트가 없음($symbol)" }
            return StockPriceHistory(symbol = symbol, points = points)
        }
    }
}
