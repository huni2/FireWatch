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

    fun fetchExchangeRates(date: LocalDate = LocalDate.now()): ExchangeRates {
        check(eximApiKey.isNotBlank()) { "EXIM_API_KEY가 설정되지 않았습니다" }

        val response = eximClient.get()
            .uri { builder ->
                builder.path("/site/program/financial/exchangeJSON")
                    .queryParam("authkey", eximApiKey)
                    .queryParam("searchdate", date.format(DATE_FORMAT))
                    .queryParam("data", "AP01")
                    .build()
            }
            .retrieve()
            .bodyToMono<List<Map<String, Any?>>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("한국수출입은행 API 응답이 비어 있음")

        return parseExchangeRates(response)
    }

    fun fetchPreciousMetalPrices(): PreciousMetalPrices = PreciousMetalPrices(
        goldPriceUsd = fetchYahooPrice(GOLD_SYMBOL),
        silverPriceUsd = fetchYahooPrice(SILVER_SYMBOL),
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
        private const val GOLD_SYMBOL = "GC=F"
        private const val SILVER_SYMBOL = "SI=F"
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
