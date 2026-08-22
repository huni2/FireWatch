package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.math.BigDecimal
import java.time.Duration
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class ExchangeRates(
    val usdKrw: BigDecimal?,
    val jpy100Krw: BigDecimal?,
    val cnyKrw: BigDecimal?,
)

data class PreciousMetalPrices(
    val goldPriceUsd: BigDecimal?,
    val silverPriceUsd: BigDecimal?,
)

// 2026-08-23 사용자 요청("금,은,환율,국채,국장,미장 다 볼 수 있고") — 국내외 지수 + 미국채 수익률.
// 한국국채 10년물은 Yahoo에 수익률(%) 데이터가 없어(ETF 가격만 검색됨, 실측 확인) 제외 — Next-Tasks BE-10.
data class MarketIndices(
    val kospi: BigDecimal?,
    val kosdaq: BigDecimal?,
    val sp500: BigDecimal?,
    val nasdaq: BigDecimal?,
    val dow: BigDecimal?,
    val usBondYield10y: BigDecimal?,
)

/**
 * Design Ref: docs/02-design/features/firewatch.design.md §2.2 — 금/은/환율 수집.
 *
 * 한국수출입은행 exchangeJSON: 2026-08-19 실측 확인 — 응답은 통화 목록의 JSON 배열(에러여도 배열),
 * `result`=1이 성공. `cur_unit`은 JPY가 "JPY(100)", 위안화는 "CNY"가 아니라 **"CNH"**(역외 위안)로 온다.
 * 도메인은 2025-06-25부로 oapi.koreaexim.go.kr로 이전됨(구 도메인 단계적 폐지).
 *
 * Yahoo Finance 비공식 v8 chart 엔드포인트: 2026-08-19 실측 확인 — `User-Agent` 헤더 없이 호출하면 429.
 * `chart.result[0].meta.regularMarketPrice`가 현재가(USD/트로이온스, 선물 GC=F/SI=F 기준).
 * 비공식 API라 예고 없이 막힐 수 있다 — 이 클라이언트가 실패하면 [com.firewatch.backend.audit.AuditLogAspect]가
 * FINANCIAL_API/FAILURE로 기록하고, SchedulerJob이 해당 필드를 null로 둔 채 브리핑을 계속 저장한다.
 */
@Component
class FinancialApiClient(
    @Value("\${firewatch.exim.base-url}") eximBaseUrl: String,
    @Value("\${firewatch.exim.api-key}") private val eximApiKey: String,
    @Value("\${firewatch.yahoo.base-url}") yahooBaseUrl: String,
) {
    private val eximClient = WebClient.builder().baseUrl(eximBaseUrl).build()
    private val yahooClient = WebClient.builder()
        .baseUrl(yahooBaseUrl)
        .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; FireWatch/1.0)")
        .build()

    // 은행 공지: "비영업일의 데이터, 혹은 영업당일 11시 이전에 해당일의 데이터를 요청할 경우 null 값이
    // 반환"(2026-08-21 실측 확인 — 08:00 KST 스케줄러가 당일자를 요청해 매번 빈 배열을 받고 있었다).
    // 스케줄러는 항상 11시 이전(08:00 KST)에 도니 애초에 "오늘"을 요청하면 안 된다 — 전일부터 거꾸로
    // 조회해 데이터가 있는 가장 최근 영업일을 찾는다(주말/공휴일 며칠 연속 대비 최대 MAX_LOOKBACK_DAYS일).
    fun fetchExchangeRates(date: LocalDate = LocalDate.now()): ExchangeRates {
        check(eximApiKey.isNotBlank()) { "EXIM_API_KEY가 설정되지 않았습니다" }

        for (daysAgo in 1..MAX_LOOKBACK_DAYS) {
            val searchDate = date.minusDays(daysAgo.toLong())
            val response = eximClient.get()
                .uri { builder ->
                    builder.path("/site/program/financial/exchangeJSON")
                        .queryParam("authkey", eximApiKey)
                        .queryParam("searchdate", searchDate.format(DATE_FORMAT))
                        .queryParam("data", "AP01")
                        .build()
                }
                .retrieve()
                .bodyToMono<List<Map<String, Any?>>>()
                .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .block()
                ?: error("한국수출입은행 API 응답이 비어 있음")

            if (response.any { (it["result"] as? Number)?.toInt() == 1 }) {
                return parseExchangeRates(response)
            }
        }
        error("한국수출입은행 API가 최근 ${MAX_LOOKBACK_DAYS}일간 유효한 환율을 반환하지 않음")
    }

    fun fetchPreciousMetalPrices(): PreciousMetalPrices = PreciousMetalPrices(
        goldPriceUsd = fetchYahooPrice(GOLD_SYMBOL),
        silverPriceUsd = fetchYahooPrice(SILVER_SYMBOL),
    )

    // 2026-08-23 실측 확인(curl -A "Mozilla/5.0..."): ^KS11=코스피, ^KQ11=코스닥, ^GSPC=S&P500,
    // ^IXIC=나스닥종합, ^DJI=다우존스 전부 정상 응답. ^TNX(미국채10년물)는 이미 %값 그대로 온다(×10 아님).
    fun fetchMarketIndices(): MarketIndices = MarketIndices(
        kospi = fetchYahooPrice(KOSPI_SYMBOL),
        kosdaq = fetchYahooPrice(KOSDAQ_SYMBOL),
        sp500 = fetchYahooPrice(SP500_SYMBOL),
        nasdaq = fetchYahooPrice(NASDAQ_SYMBOL),
        dow = fetchYahooPrice(DOW_SYMBOL),
        usBondYield10y = fetchYahooPrice(US_BOND_10Y_SYMBOL),
    )

    private fun fetchYahooPrice(symbol: String): BigDecimal {
        val response = yahooClient.get()
            .uri("/v8/finance/chart/$symbol?interval=1d&range=5d")
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("Yahoo Finance 응답이 비어 있음: $symbol")
        return parseYahooPrice(response, symbol)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 15L
        private const val MAX_LOOKBACK_DAYS = 7
        private const val GOLD_SYMBOL = "GC=F"
        private const val SILVER_SYMBOL = "SI=F"
        private const val KOSPI_SYMBOL = "^KS11"
        private const val KOSDAQ_SYMBOL = "^KQ11"
        private const val SP500_SYMBOL = "^GSPC"
        private const val NASDAQ_SYMBOL = "^IXIC"
        private const val DOW_SYMBOL = "^DJI"
        private const val US_BOND_10Y_SYMBOL = "^TNX"
        private val DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd")

        private const val CUR_UNIT_USD = "USD"
        private const val CUR_UNIT_JPY100 = "JPY(100)"
        private const val CUR_UNIT_CNH = "CNH"

        internal fun parseExchangeRates(response: List<Map<String, Any?>>): ExchangeRates {
            val byUnit = response
                .filter { (it["result"] as? Number)?.toInt() == 1 }
                .associateBy { it["cur_unit"] as? String }

            check(byUnit.isNotEmpty()) { "한국수출입은행 API가 유효한 환율을 반환하지 않음(응답: $response)" }

            fun rateOf(unit: String): BigDecimal? =
                (byUnit[unit]?.get("deal_bas_r") as? String)?.replace(",", "")?.toBigDecimalOrNull()

            return ExchangeRates(
                usdKrw = rateOf(CUR_UNIT_USD),
                jpy100Krw = rateOf(CUR_UNIT_JPY100),
                cnyKrw = rateOf(CUR_UNIT_CNH),
            )
        }

        @Suppress("UNCHECKED_CAST")
        internal fun parseYahooPrice(response: Map<String, Any?>, symbol: String): BigDecimal {
            val chart = response["chart"] as? Map<String, Any?> ?: error("Yahoo 응답 형식 이상($symbol): chart 없음")
            val results = chart["result"] as? List<Map<String, Any?>>
                ?: error("Yahoo 응답 형식 이상($symbol): result 없음")
            val meta = results.firstOrNull()?.get("meta") as? Map<String, Any?>
                ?: error("Yahoo 응답 형식 이상($symbol): meta 없음")
            val price = meta["regularMarketPrice"] ?: error("Yahoo 응답에 regularMarketPrice 없음($symbol)")
            return when (price) {
                is Number -> BigDecimal(price.toString())
                is String -> price.toBigDecimal()
                else -> error("Yahoo regularMarketPrice 타입 이상($symbol): $price")
            }
        }
    }
}
