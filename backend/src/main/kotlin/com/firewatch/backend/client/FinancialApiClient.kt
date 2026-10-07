package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.math.BigDecimal
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneId
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
// 한국국채 10년물은 Yahoo에 수익률(%) 데이터가 없어(ETF 가격만 검색됨, 실측 확인) 제외됐다가,
// 한국은행 ECOS Open API에서 확보해 BE-10으로 추가(krBondYield10y).
data class MarketIndices(
    val kospi: BigDecimal?,
    val kosdaq: BigDecimal?,
    val sp500: BigDecimal?,
    val nasdaq: BigDecimal?,
    val dow: BigDecimal?,
    val usBondYield10y: BigDecimal?,
    val krBondYield10y: BigDecimal?,
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
    @Value("\${firewatch.ecos.base-url}") ecosBaseUrl: String,
    @Value("\${firewatch.ecos.api-key}") private val ecosApiKey: String,
) {
    private val eximClient = WebClient.builder().baseUrl(eximBaseUrl).build()
    private val yahooClient = WebClient.builder()
        .baseUrl(yahooBaseUrl)
        .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; FireWatch/1.0)")
        .build()
    private val ecosClient = WebClient.builder().baseUrl(ecosBaseUrl).build()

    // 은행 공지: "비영업일의 데이터, 혹은 영업당일 11시 이전에 해당일의 데이터를 요청할 경우 null 값이
    // 반환"(2026-08-21 실측 확인 — 08:00 KST 스케줄러가 당일자를 요청해 매번 빈 배열을 받고 있었다).
    // 스케줄러는 항상 11시 이전(08:00 KST)에 도니 애초에 "오늘"을 요청하면 안 된다 — 전일부터 거꾸로
    // 조회해 데이터가 있는 가장 최근 영업일을 찾는다(주말/공휴일 며칠 연속 대비 최대 MAX_LOOKBACK_DAYS일).
    fun fetchExchangeRates(date: LocalDate = LocalDate.now(ZoneId.of("Asia/Seoul"))): ExchangeRates {
        check(eximApiKey.isNotBlank()) { "EXIM_API_KEY가 설정되지 않았습니다" }

        for (daysAgo in 1..MAX_LOOKBACK_DAYS) {
            val searchDate = date.minusDays(daysAgo.toLong())
            val response = try { eximClient.get()
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
            } catch (_: Exception) {
                // Request URLs contain authkey. Never propagate them into logs or causes.
                throw IllegalStateException("한국수출입은행 API 호출 실패")
            }

            if (response.any { (it["result"] as? Number)?.toInt() == 1 }) {
                return parseExchangeRates(response)
            }
        }
        error("한국수출입은행 API가 최근 ${MAX_LOOKBACK_DAYS}일간 유효한 환율을 반환하지 않음")
    }

    fun fetchPreciousMetalPrices(): PreciousMetalPrices = PreciousMetalPrices(
        goldPriceUsd = availablePrice(GOLD_SYMBOL),
        silverPriceUsd = availablePrice(SILVER_SYMBOL),
    )

    // 2026-08-23 실측 확인(curl -A "Mozilla/5.0..."): ^KS11=코스피, ^KQ11=코스닥, ^GSPC=S&P500,
    // ^IXIC=나스닥종합, ^DJI=다우존스 전부 정상 응답. ^TNX(미국채10년물)는 이미 %값 그대로 온다(×10 아님).
    fun fetchMarketIndices(): MarketIndices = MarketIndices(
        kospi = availablePrice(KOSPI_SYMBOL),
        kosdaq = availablePrice(KOSDAQ_SYMBOL),
        sp500 = availablePrice(SP500_SYMBOL),
        nasdaq = availablePrice(NASDAQ_SYMBOL),
        dow = availablePrice(DOW_SYMBOL),
        usBondYield10y = availablePrice(US_BOND_10Y_SYMBOL),
        krBondYield10y = runCatching { fetchKoreaBondYield10y() }.getOrNull(),
    )

    // Each asset gets one request. A single failed/invalid asset must not erase its peers.
    private fun availablePrice(symbol: String): BigDecimal? =
        runCatching { fetchYahooPrice(symbol).takeIf { it.signum() > 0 } }.getOrNull()

    // ECOS(한국은행 Open API) 인증키는 쿼리파라미터가 아니라 URL 경로 자체에 들어간다
    // (`/api/StatisticSearch/{키}/...`) — 실측 확인(2026-10-02). 그래서 HTTP 에러·타임아웃·연결 실패 시
    // Spring의 기본 예외(WebClientResponseException 등)는 메시지에 그 요청 URI를 키가 박힌 그대로 담는다.
    // 이 예외가 그대로 올라가면 AuditLogAspect가 FAILURE의 response_summary로 저장하는데, 이건
    // `GET /api/audit-logs`로 웹 감사로그 화면에 그대로 노출되는 공개 데이터라 키가 새어나간다 — 그래서
    // 어떤 예외든 절대 그대로 던지지 않고 키·URL이 전혀 없는 고정 메시지로 교체한다(원인도 담지 않음,
    // 스택트레이스를 통째로 출력하는 로깅 경로까지 대비). 이 방어를 우회하는 변경은 하지 말 것.
    private fun fetchKoreaBondYield10y(): BigDecimal? {
        if (ecosApiKey.isBlank()) return null
        val today = LocalDate.now(ZoneId.of("Asia/Seoul"))
        return try {
            val response = ecosClient.get()
                .uri(
                    "/api/StatisticSearch/$ecosApiKey/json/kr/1/100/$ECOS_BOND_STAT_CODE/D/" +
                        "${today.minusDays(ECOS_LOOKBACK_DAYS).format(DATE_FORMAT)}/${today.format(DATE_FORMAT)}/" +
                        ECOS_BOND_10Y_ITEM_CODE,
                )
                .retrieve()
                .bodyToMono<Map<String, Any?>>()
                .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .block()
                ?: error(ECOS_ERROR_MESSAGE)
            parseEcosLatestYield(response)
        } catch (ex: Exception) {
            throw IllegalStateException(ECOS_ERROR_MESSAGE)
        }
    }

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
        // ECOS 통계표 817Y002(시장금리, 일별) 중 국고채(10년) 항목코드 010210000 — "sample" 키로
        // 실제 응답 확인(2026-10-02). 주말/공휴일 대비 최근 5영업일 범위로 조회해 가장 최신 값을 쓴다.
        private const val ECOS_BOND_STAT_CODE = "817Y002"
        private const val ECOS_BOND_10Y_ITEM_CODE = "010210000"
        private const val ECOS_LOOKBACK_DAYS = 7L
        private const val ECOS_ERROR_MESSAGE = "한국은행 ECOS API 호출 실패"

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

        // 응답 본문엔 인증키가 없어 메시지에 그대로 노출해도 안전하지만, 호출부(fetchKoreaBondYield10y)가
        // 이 함수가 던지는 예외까지 포함해 전부 고정 메시지로 교체하므로 실제로는 안 쓰인다 — 그래도 혹시
        // 호출부가 바뀌어도 안전하도록 키를 담지 않는다.
        @Suppress("UNCHECKED_CAST")
        internal fun parseEcosLatestYield(response: Map<String, Any?>): BigDecimal {
            val body = response["StatisticSearch"] as? Map<String, Any?> ?: error("ECOS 응답 형식 이상: StatisticSearch 없음")
            val rows = body["row"] as? List<Map<String, Any?>> ?: error("ECOS 응답 형식 이상: row 없음")
            val latest = rows.maxByOrNull { it["TIME"] as? String ?: "" } ?: error("ECOS 응답에 데이터가 없음")
            return (latest["DATA_VALUE"] as? String)?.toBigDecimalOrNull()
                ?: error("ECOS DATA_VALUE 형식 이상: ${latest["DATA_VALUE"]}")
        }
    }
}
