package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import org.springframework.web.util.UriUtils
import java.math.BigDecimal
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant

data class StockPricePoint(val timestamp: String, val close: BigDecimal)
data class StockPriceHistory(val symbol: String, val points: List<StockPricePoint>)
data class StockSearchResult(val symbol: String, val name: String, val exchange: String?)

// 2026-08-21 사용자 요청 — "5년/6개월/3개월/1달/일주일/하루 이렇게 시간적으로 볼 수 있는 차트가 필요".
// Yahoo 쪽 (interval, range) 조합. 분봉은 짧은 기간에서만 허용되는 Yahoo 쪽 제약을 그대로 따른다.
enum class StockRange(internal val yahooInterval: String, internal val yahooRange: String) {
    DAY("1m", "1d"), // 오늘 하루, 1분봉 — 프론트가 주기적으로 재조회해 실시간처럼 보여준다
    WEEK("30m", "5d"),
    MONTH("1d", "1mo"),
    THREE_MONTH("1d", "3mo"),
    SIX_MONTH("1d", "6mo"), // 기본값
    FIVE_YEAR("1wk", "5y"),
}

/**
 * [FinancialApiClient]와 같은 Yahoo Finance 비공식 v8 chart 엔드포인트를 임의 종목 티커로 재사용한다.
 * 국내 종목은 코스피 `005930.KS`/코스닥 `.KQ`, 해외는 `AAPL`처럼 티커 그대로 입력받는다.
 *
 * "실시간"은 진짜 틱 스트리밍이 아니라 — Yahoo 비공식 API가 웹소켓을 안 주기도 하고, 진짜 실시간
 * 스트리밍은 대부분 가입/키가 필요한 유료·무료티어 서비스라 이 프로젝트의 "가입 없이" 원칙에 안 맞는다.
 * 대신 짧은 기간(하루)은 분봉을 가져오고 프론트가 짧은 주기로 재조회하는 폴링 방식으로 근사한다.
 */
@Component
class StockApiClient(
    @Value("\${firewatch.yahoo.base-url}") yahooBaseUrl: String,
) {
    private val yahooClient = WebClient.builder()
        .baseUrl(yahooBaseUrl)
        .defaultHeader("User-Agent", "Mozilla/5.0 (compatible; FireWatch/1.0)")
        .build()

    fun fetchPriceHistory(symbol: String, range: StockRange = StockRange.SIX_MONTH): StockPriceHistory {
        val response = yahooClient.get()
            .uri("/v8/finance/chart/$symbol?interval=${range.yahooInterval}&range=${range.yahooRange}")
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("Yahoo Finance 응답이 비어 있음: $symbol")
        return parseHistory(response, symbol)
    }

    // 사용자가 정확한 티커를 몰라 검색이 필요하다는 요청(2026-08-21). Yahoo 검색은 한글 종목명을 못 알아듣는다
    // (실측 확인 — "Samsung"은 되지만 "삼성전자"·"카카오"·"현대차"는 전부 "Invalid Search Query" 아니면
    // 엉뚱한 결과). 그래서 자주 찾을 국내 대형주 한글명은 로컬 별칭표로 먼저 매칭하고, 없으면 Yahoo로 폴백한다
    // (영문 검색·해외 종목은 Yahoo가 잘 처리함).
    fun searchSymbols(query: String): List<StockSearchResult> {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return emptyList()

        val localMatches = KOREAN_STOCK_ALIASES.entries
            .filter { (name, _) -> name.contains(trimmed) }
            .map { (name, symbol) -> StockSearchResult(symbol = symbol, name = name, exchange = "Korea") }
        if (localMatches.isNotEmpty()) return localMatches.take(10)

        val encoded = UriUtils.encode(trimmed, StandardCharsets.UTF_8)
        val response = yahooClient.get()
            .uri("/v1/finance/search?q=$encoded&quotesCount=10&newsCount=0")
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("Yahoo 검색 응답이 비어 있음: $query")
        return parseSearchResults(response)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 15L

        // 코스피/코스닥 시가총액 상위권 위주 — 전수가 아니라 자주 찾을 법한 대형주만 커버(유지보수 부담 최소화).
        // 여기 없는 종목은 Yahoo 영문 검색으로 폴백되므로, 정확한 영문 사명을 알면 그걸로도 찾을 수 있다.
        private val KOREAN_STOCK_ALIASES = mapOf(
            "삼성전자" to "005930.KS",
            "SK하이닉스" to "000660.KS",
            "LG에너지솔루션" to "373220.KS",
            "삼성바이오로직스" to "207940.KS",
            "현대차" to "005380.KS",
            "기아" to "000270.KS",
            "셀트리온" to "068270.KS",
            "네이버" to "035420.KS",
            "NAVER" to "035420.KS",
            "포스코홀딩스" to "005490.KS",
            "LG화학" to "051910.KS",
            "삼성SDI" to "006400.KS",
            "카카오" to "035720.KS",
            "KB금융" to "105560.KS",
            "신한지주" to "055550.KS",
            "현대모비스" to "012330.KS",
            "LG전자" to "066570.KS",
            "SK이노베이션" to "096770.KS",
            "SK텔레콤" to "017670.KS",
            "카카오뱅크" to "323410.KS",
            "하나금융지주" to "086790.KS",
            "삼성화재" to "000810.KS",
            "삼성생명" to "032830.KS",
            "삼성에스디에스" to "018260.KS",
            "삼성전기" to "009150.KS",
            "크래프톤" to "259960.KS",
            "하이브" to "352820.KS",
            "엔씨소프트" to "036570.KS",
            "넷마블" to "251270.KS",
            "카카오게임즈" to "293490.KS",
            "고려아연" to "010130.KS",
            "에코프로비엠" to "247540.KQ",
            "에코프로" to "086520.KQ",
            "알테오젠" to "196170.KQ",
        )

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

        @Suppress("UNCHECKED_CAST")
        internal fun parseSearchResults(response: Map<String, Any?>): List<StockSearchResult> {
            val quotes = response["quotes"] as? List<Map<String, Any?>> ?: emptyList()
            return quotes.mapNotNull { quote ->
                val symbol = quote["symbol"] as? String ?: return@mapNotNull null
                val name = (quote["longname"] ?: quote["shortname"] ?: symbol) as String
                val exchange = quote["exchDisp"] as? String
                StockSearchResult(symbol = symbol, name = name, exchange = exchange)
            }
        }
    }
}
