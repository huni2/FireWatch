package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.math.BigDecimal
import java.time.Duration

data class GeminiBriefingResult(
    val marketSummary: String,
    val recommendedStocks: List<String>,
)

/**
 * Design Ref: docs/02-design/features/firewatch.design.md §2.2 — Gemini 호출 (FR-01, FR-02).
 * REST 형식: endpoint `{base}/models/{model}:generateContent`, 인증은 `x-goog-api-key` 헤더.
 * 모델명은 자주 바뀌므로 `firewatch.gemini.model`로 뺐다.
 *
 * **Search Grounding 도구(`tools: [{"google_search": {}}]`)는 안 쓴다** — 2026-08-21 실측 확인 결과 무료 티어에서
 * Gemini 3 계열 전부(3/3.1/3.5/3.6/3.7) grounding 도구 자체의 일일 할당량이 0건이라 항상 429/404였음
 * ([[llm-wiki/Decisions/0011-gemini-no-grounding]]). 대신 이미 다른 소스(Yahoo/수출입은행 시세, RSS 뉴스)로
 * 실제 데이터를 확보해두고, Gemini는 실시간 검색 없이 **그 데이터를 자연어로 요약·해설**하는 역할만 한다 —
 * 이건 grounding과 별개인 일반 `generateContent` 호출이라 무료 티어 할당량이 훨씬 넉넉하다.
 *
 * 실패(예외)·지연(3초+)에 대한 WARNING/FAILURE 판정은 이 클래스가 아니라 [com.firewatch.backend.audit.AuditLogAspect]가
 * 호출 소요시간을 재서 일괄 처리한다 — 이 클라이언트는 그냥 호출하고 실패하면 예외를 던지기만 하면 된다.
 */
@Component
class GeminiClient(
    @Value("\${firewatch.gemini.base-url}") baseUrl: String,
    @Value("\${firewatch.gemini.api-key}") private val apiKey: String,
    @Value("\${firewatch.gemini.model}") private val model: String,
) {
    // Boot 4에서 WebClient.Builder 오토컨피그 빈이 기본 제공되지 않아(webflux 스타터만으로는 부족) 직접 생성한다.
    private val webClient = WebClient.builder().baseUrl(baseUrl).build()

    fun fetchMarketBriefing(
        goldPrice: BigDecimal?,
        silverPrice: BigDecimal?,
        usdKrw: BigDecimal?,
        jpy100Krw: BigDecimal?,
        cnyKrw: BigDecimal?,
        kospi: BigDecimal?,
        kosdaq: BigDecimal?,
        sp500: BigDecimal?,
        nasdaq: BigDecimal?,
        dow: BigDecimal?,
        usBondYield10y: BigDecimal?,
        newsArticles: List<NewsArticleResult>,
    ): GeminiBriefingResult {
        check(apiKey.isNotBlank()) { "GEMINI_API_KEY가 설정되지 않았습니다" }

        val prompt = buildPrompt(
            goldPrice, silverPrice, usdKrw, jpy100Krw, cnyKrw,
            kospi, kosdaq, sp500, nasdaq, dow, usBondYield10y,
            newsArticles,
        )
        val requestBody = mapOf(
            "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
        )

        val response = webClient.post()
            .uri("/models/$model:generateContent")
            .header("x-goog-api-key", apiKey)
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("Gemini 응답 본문이 비어 있음")

        return parseResponse(response)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 20L
        private val STOCK_LINE_REGEX = Regex("""^추천\s*종목\s*[:：]\s*(.+)$""", RegexOption.MULTILINE)

        internal fun buildPrompt(
            goldPrice: BigDecimal?,
            silverPrice: BigDecimal?,
            usdKrw: BigDecimal?,
            jpy100Krw: BigDecimal?,
            cnyKrw: BigDecimal?,
            kospi: BigDecimal?,
            kosdaq: BigDecimal?,
            sp500: BigDecimal?,
            nasdaq: BigDecimal?,
            dow: BigDecimal?,
            usBondYield10y: BigDecimal?,
            newsArticles: List<NewsArticleResult>,
        ): String {
            val newsSection = if (newsArticles.isEmpty()) {
                "(오늘은 참고할 뉴스 데이터가 없습니다)"
            } else {
                newsArticles.joinToString("\n") { "- ${it.title}: ${it.description}" }
            }
            return """
                당신은 한국 개인 투자자를 위한 아침 증시 브리핑 작성자입니다. 아래 오늘의 데이터를 참고해
                자연스러운 문장으로 브리핑을 작성해주세요. 실시간 검색은 하지 말고 주어진 데이터만 근거로 삼으세요.

                [오늘의 시세]
                - 금(XAU) 가격: ${goldPrice ?: "정보 없음"} USD/oz
                - 은(XAG) 가격: ${silverPrice ?: "정보 없음"} USD/oz
                - 원/달러: ${usdKrw ?: "정보 없음"}
                - 원/엔(100엔): ${jpy100Krw ?: "정보 없음"}
                - 원/위안: ${cnyKrw ?: "정보 없음"}

                [오늘의 지수·채권]
                - 코스피: ${kospi ?: "정보 없음"}
                - 코스닥: ${kosdaq ?: "정보 없음"}
                - S&P500: ${sp500 ?: "정보 없음"}
                - 나스닥종합: ${nasdaq ?: "정보 없음"}
                - 다우존스: ${dow ?: "정보 없음"}
                - 미국채 10년물 수익률: ${usBondYield10y ?: "정보 없음"}%

                [오늘의 관련 뉴스]
                $newsSection

                요청:
                1. 위 시세 데이터를 참고해 오늘 국내외 증시에 참고할 만한 코멘트를 3분 안에 읽을 분량으로 정리해줘.
                2. 위 뉴스와 시세 흐름을 참고해 관심 가질 만한 테마주나 섹터를 2~3개 추천하고 간단한 이유를 붙여줘
                   — 실시간 시세 조회 없이 일반적인 상관관계 수준의 참고용 추천이라는 점을 자연스럽게 녹여줘.
                3. 마지막 줄에는 위에서 언급한 구체적인 종목명만 쉼표로 구분해서 정확히 이 형식으로 딱 한 줄 추가해줘
                   (다른 설명 없이): 추천종목: 삼성전자, SK하이닉스
            """.trimIndent()
        }

        @Suppress("UNCHECKED_CAST")
        internal fun parseResponse(response: Map<String, Any?>): GeminiBriefingResult {
            val candidates = response["candidates"] as? List<Map<String, Any?>>
                ?: error("Gemini 응답에 candidates 없음: $response")
            val firstCandidate = candidates.firstOrNull() ?: error("Gemini candidates가 비어 있음")
            val content = firstCandidate["content"] as? Map<String, Any?>
                ?: error("Gemini 응답 형식 이상: content 없음")
            val parts = content["parts"] as? List<Map<String, Any?>>
                ?: error("Gemini 응답 형식 이상: parts 없음")
            val text = parts.joinToString("\n") { it["text"]?.toString().orEmpty() }.trim()
            check(text.isNotEmpty()) { "Gemini 응답 텍스트가 비어 있음" }

            // 프롬프트가 마지막 줄에 "추천종목: A, B" 형식을 요청 — 그 줄만 뽑아 구조화하고 본문에서는 뺀다.
            val stockLine = STOCK_LINE_REGEX.find(text)
            val recommendedStocks = stockLine?.groupValues?.get(1)
                ?.split(",", "、")
                ?.map { it.trim() }
                ?.filter { it.isNotEmpty() }
                ?: emptyList()
            val marketSummary = if (stockLine != null) text.replace(stockLine.value, "").trim() else text

            return GeminiBriefingResult(marketSummary = marketSummary, recommendedStocks = recommendedStocks)
        }
    }
}
