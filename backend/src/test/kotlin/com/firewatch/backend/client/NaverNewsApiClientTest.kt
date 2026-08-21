package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 순수 파싱 함수만 검증(네트워크 없음)
class NaverNewsApiClientTest {

    @Test
    fun `title-description의 검색어 강조 태그와 HTML 엔티티를 벗겨낸다`() {
        assertEquals("코스피 강세 \"기대\"", NaverNewsApiClient.stripHtml("코스피 <b>강세</b> &quot;기대&quot;"))
    }

    @Test
    fun `originallink가 있으면 그걸 쓰고, 없으면 link로 대체한다`() {
        val response = mapOf(
            "items" to listOf(
                mapOf(
                    "title" to "<b>코스피</b> 상승",
                    "originallink" to "https://example.com/news/1",
                    "link" to "https://n.news.naver.com/1",
                    "description" to "코스피가 상승했다",
                    "pubDate" to "Fri, 21 Aug 2026 08:30:00 +0900",
                ),
                mapOf(
                    "title" to "코스닥 소식",
                    "originallink" to "",
                    "link" to "https://n.news.naver.com/2",
                    "description" to "코스닥 소식입니다",
                    "pubDate" to "Fri, 21 Aug 2026 09:00:00 +0900",
                ),
            ),
        )

        val articles = NaverNewsApiClient.parseNewsResponse(response)

        assertEquals("코스피 상승", articles[0].title)
        assertEquals("https://example.com/news/1", articles[0].link)
        assertNotNull(articles[0].pubDate)
        assertEquals("https://n.news.naver.com/2", articles[1].link)
    }

    @Test
    fun `pubDate 형식이 이상하면 예외 대신 null로 둔다`() {
        val response = mapOf(
            "items" to listOf(
                mapOf("title" to "제목", "link" to "https://example.com", "description" to "설명", "pubDate" to "이상한 날짜"),
            ),
        )

        val articles = NaverNewsApiClient.parseNewsResponse(response)

        assertNull(articles[0].pubDate)
    }

    @Test
    fun `items가 없으면 예외를 던진다`() {
        assertFailsWith<IllegalStateException> {
            NaverNewsApiClient.parseNewsResponse(emptyMap())
        }
    }
}
