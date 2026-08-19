package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.time.Duration

data class GeminiBriefingResult(
    val marketSummary: String,
    val recommendedStocks: List<String>,
)

/**
 * Design Ref: docs/02-design/features/firewatch.design.md §2.2 — Gemini Search Grounding 호출 (FR-01, FR-02).
 * REST 형식은 https://ai.google.dev/gemini-api/docs/generate-content/google-search 2026-08-19 확인값:
 * endpoint `{base}/models/{model}:generateContent`, 인증은 `x-goog-api-key` 헤더,
 * 검색 도구는 `tools: [{ "google_search": {} }]`. 모델명은 자주 바뀌므로 `firewatch.gemini.model`로 뺐다.
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

    fun fetchMarketBriefing(): GeminiBriefingResult {
        check(apiKey.isNotBlank()) { "GEMINI_API_KEY가 설정되지 않았습니다" }

        val requestBody = mapOf(
            "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to PROMPT)))),
            "tools" to listOf(mapOf("google_search" to emptyMap<String, Any>())),
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
        private val PROMPT = """
            오늘 한국 시간 기준 국내(코스피/코스닥)와 미국(S&P500/나스닥) 증시 동향을 요약해줘.
            주요 호재/악재 뉴스와 관심 가질 만한 테마주/종목도 함께 알려줘.
            일반 투자자가 아침에 3분 안에 읽을 수 있는 분량으로 정리해줘.
        """.trimIndent()

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

            // Gemini가 자유 텍스트로 응답 — 추천 종목 구조화 추출은 하지 않는다(TODO: 필요해지면 JSON 응답 모드 검토).
            return GeminiBriefingResult(marketSummary = text, recommendedStocks = emptyList())
        }
    }
}
