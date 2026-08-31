package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import org.w3c.dom.Element
import org.xml.sax.InputSource
import java.io.StringReader
import java.time.Duration
import java.time.Instant
import java.time.format.DateTimeFormatter
import javax.xml.parsers.DocumentBuilderFactory

data class NewsArticleResult(
    val title: String,
    val link: String,
    val description: String,
    val pubDate: Instant?,
)

/**
 * 관련 뉴스 RSS 피드(기본값: 아시아경제 증권 https://view.asiae.co.kr/rss/stock.htm — 2026-08-21 실측
 * 확인, 회원가입/API 키 불필요). Gemini Search Grounding이 무료 티어에서 막혀 있어 도입했다가
 * (원래 네이버 검색 API를 쓰려 했으나 NAVER API HUB로 이전되며 신규 신청이 막혔고, 대안으로 검토한
 * Google Custom Search·네이버클라우드플랫폼도 카드 등록 불확실성이 있어 최종적으로 RSS로 결정 —
 * [[Decisions/0010-rss-news-instead-of-gemini-grounding]]) 카드/가입이 전혀 필요 없는 이 방식으로 확정.
 * RSS는 키워드 검색이 안 되고 피드 자체가 이미 "국내 증시"로 고정돼 있어 최신순으로 그대로 쓴다.
 */
@Component
class NewsRssClient(
    @Value("\${firewatch.news.rss-url}") private val rssUrl: String,
) {
    private val webClient = WebClient.builder().build()

    fun fetchLatest(limit: Int = DEFAULT_LIMIT): List<NewsArticleResult> {
        val xml = webClient.get()
            .uri(rssUrl)
            .retrieve()
            .bodyToMono<String>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("RSS 피드 응답이 비어 있음")

        return parseRss(xml).take(limit)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 10L
        // 2026-09-01 — 관심 키워드 기반 핫이슈 필터링(WEB-7)의 매칭 여지를 넓히려고 5→20으로 확대.
        // Gemini 프롬프트에는 여전히 상위 5건만 넘긴다(SchedulerJob 참고) — 프롬프트 비대화로 인한
        // 타임아웃 위험을 늘리지 않기 위해서다.
        private const val DEFAULT_LIMIT = 20
        private val HTML_TAG_REGEX = Regex("<[^>]*>")

        internal fun parseRss(xml: String): List<NewsArticleResult> {
            // XXE 방지 — 외부 DTD/엔티티 로딩을 차단한다(신뢰 안 하는 원격 XML을 파싱할 때 필수).
            val factory = DocumentBuilderFactory.newInstance().apply {
                setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
                isExpandEntityReferences = false
            }
            val document = factory.newDocumentBuilder().parse(InputSource(StringReader(xml)))
            val items = document.getElementsByTagName("item")

            return (0 until items.length).map { i ->
                val item = items.item(i) as Element
                NewsArticleResult(
                    title = item.textOf("title").replace(HTML_TAG_REGEX, "").trim(),
                    link = item.textOf("link").trim(),
                    description = item.textOf("description").replace(HTML_TAG_REGEX, "").trim(),
                    pubDate = item.textOf("pubDate").trim().takeIf { it.isNotEmpty() }?.let {
                        runCatching { DateTimeFormatter.RFC_1123_DATE_TIME.parse(it, Instant::from) }.getOrNull()
                    },
                )
            }
        }

        // DOM은 CDATA 섹션을 자동으로 일반 텍스트로 풀어준다 — 별도 CDATA 처리 불필요.
        private fun Element.textOf(tag: String): String =
            getElementsByTagName(tag).item(0)?.textContent ?: ""
    }
}
