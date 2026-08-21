package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.time.Duration
import java.time.Instant
import java.time.format.DateTimeFormatter

data class NewsArticleResult(
    val title: String,
    val link: String,
    val description: String,
    val pubDate: Instant?,
)

/**
 * 네이버 검색 오픈API(뉴스). 2026-08-21 실측 확인 — 엔드포인트 `/v1/search/news.json`,
 * 인증은 `X-Naver-Client-Id`/`X-Naver-Client-Secret` 헤더. 응답 title/description은
 * 검색어 강조를 위해 `<b>` 태그와 HTML 엔티티가 섞여 와서 그대로 못 쓰고 벗겨내야 한다.
 * `originallink`가 실제 언론사 원문(사용자가 "클릭하면 실제로 볼 수 있게" 요청한 그 링크),
 * `link`는 네이버 뉴스 페이지로 가는 대체 링크 — originallink가 비어 있을 때만 fallback.
 */
@Component
class NaverNewsApiClient(
    @Value("\${firewatch.naver.client-id}") private val clientId: String,
    @Value("\${firewatch.naver.client-secret}") private val clientSecret: String,
    @Value("\${firewatch.naver.base-url}") baseUrl: String,
) {
    private val webClient = WebClient.builder().baseUrl(baseUrl).build()

    fun searchNews(query: String, display: Int = DEFAULT_DISPLAY): List<NewsArticleResult> {
        check(clientId.isNotBlank() && clientSecret.isNotBlank()) {
            "NAVER_CLIENT_ID/NAVER_CLIENT_SECRET이 설정되지 않았습니다"
        }

        val response = webClient.get()
            .uri { builder ->
                builder.path("/v1/search/news.json")
                    .queryParam("query", query)
                    .queryParam("display", display)
                    .queryParam("sort", "sim")
                    .build()
            }
            .header("X-Naver-Client-Id", clientId)
            .header("X-Naver-Client-Secret", clientSecret)
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("네이버 뉴스 API 응답이 비어 있음")

        return parseNewsResponse(response)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 10L
        private const val DEFAULT_DISPLAY = 5
        private val HTML_TAG_REGEX = Regex("<[^>]*>")

        internal fun stripHtml(text: String): String = text
            .replace(HTML_TAG_REGEX, "")
            .replace("&quot;", "\"")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")

        @Suppress("UNCHECKED_CAST")
        internal fun parseNewsResponse(response: Map<String, Any?>): List<NewsArticleResult> {
            val items = response["items"] as? List<Map<String, Any?>>
                ?: error("네이버 뉴스 응답 형식 이상: items 없음")

            return items.map { item ->
                val originalLink = (item["originallink"] as? String)?.takeIf { it.isNotBlank() }
                val fallbackLink = item["link"] as? String
                NewsArticleResult(
                    title = stripHtml(item["title"] as? String ?: ""),
                    link = originalLink ?: fallbackLink ?: error("뉴스 항목에 링크가 없음: $item"),
                    description = stripHtml(item["description"] as? String ?: ""),
                    pubDate = (item["pubDate"] as? String)?.let {
                        runCatching { DateTimeFormatter.RFC_1123_DATE_TIME.parse(it, Instant::from) }.getOrNull()
                    },
                )
            }
        }
    }
}
