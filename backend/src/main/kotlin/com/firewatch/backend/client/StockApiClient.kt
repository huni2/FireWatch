package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant

data class StockPricePoint(val timestamp: String, val close: BigDecimal)
data class StockPriceHistory(val symbol: String, val points: List<StockPricePoint>)

enum class StockInterval {
    DAILY, // 최근 6개월, 일봉 — 종목 화면 기본 차트
    INTRADAY, // 오늘 하루, 1분봉 — 프론트가 주기적으로 재조회해 실시간처럼 보여준다("2026-08-21 사용자 요청)
}

/**
 * [FinancialApiClient]와 같은 Yahoo Finance 비공식 v8 chart 엔드포인트를 임의 종목 티커로 재사용한다.
 * 국내 종목은 코스피 `005930.KS`/코스닥 `.KQ`, 해외는 `AAPL`처럼 티커 그대로 입력받는다.
 *
 * "실시간"은 진짜 틱 스트리밍이 아니라 — Yahoo 비공식 API가 웹소켓을 안 주기도 하고, 진짜 실시간
 * 스트리밍은 대부분 가입/키가 필요한 유료·무료티어 서비스라 이 프로젝트의 "가입 없이" 원칙에 안 맞는다.
 * 대신 오늘 하루치 1분봉을 가져오고, 프론트가 짧은 주기로 재조회하는 폴링 방식으로 근사한다.
 */
@Component
class StockApiClient(
    @Value("\${firewatch.yahoo.base-url}") yahooBaseUrl: String,
) {
    private val yahooClient = WebClient.builder()
        .baseUrl(yahooBaseUrl)
        .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; FireWatch/1.0)")
        .build()

    fun fetchPriceHistory(symbol: String, interval: StockInterval = StockInterval.DAILY): StockPriceHistory {
        val (yahooInterval, range) = when (interval) {
            StockInterval.DAILY -> "1d" to "6mo"
            StockInterval.INTRADAY -> "1m" to "1d"
        }
        val response = yahooClient.get()
            .uri("/v8/finance/chart/$symbol?interval=$yahooInterval&range=$range")
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
                val instant = Instant.ofEpochSecond(ts.toLong())
                StockPricePoint(timestamp = instant.toString(), close = BigDecimal(close.toString()))
            }
            check(points.isNotEmpty()) { "Yahoo 응답에 유효한 시세 포인트가 없음($symbol)" }
            return StockPriceHistory(symbol = symbol, points = points)
        }
    }
}
