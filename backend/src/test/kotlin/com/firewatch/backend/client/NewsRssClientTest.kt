package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 순수 파싱 함수만 검증(네트워크 없음)
class NewsRssClientTest {

    private val sampleRss = """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>아시아경제 - 증권</title>
            <item>
              <guid isPermaLink="false">2026082110324619573</guid>
              <pubDate>Fri, 21 Aug 2026 10:32:46 +0900</pubDate>
              <title><![CDATA[ NH투자증권 "디폴트옵션 적극투자형 3년 수익률 90.15%" ]]></title>
              <description><![CDATA[ NH투자증권은 2분기 퇴직연금 디폴트옵션 실적을 발표했다. ]]></description>
              <link>https://view.asiae.co.kr/article/2026082110324619573</link>
            </item>
            <item>
              <title><![CDATA[ 코스피 <b>강세</b> 마감 ]]></title>
              <description><![CDATA[ 코스피가 2%대 강세로 마감했다. ]]></description>
              <link>https://view.asiae.co.kr/article/2</link>
              <pubDate>이상한 날짜</pubDate>
            </item>
          </channel>
        </rss>
    """.trimIndent()

    @Test
    fun `RSS item에서 title-link-description-pubDate를 뽑는다`() {
        val articles = NewsRssClient.parseRss(sampleRss)

        assertEquals(2, articles.size)
        assertEquals("NH투자증권 \"디폴트옵션 적극투자형 3년 수익률 90.15%\"", articles[0].title)
        assertEquals("https://view.asiae.co.kr/article/2026082110324619573", articles[0].link)
        assertTrue(articles[0].description.contains("퇴직연금"))
        assertNotNull(articles[0].pubDate)
    }

    @Test
    fun `description의 HTML 태그를 벗겨낸다`() {
        val articles = NewsRssClient.parseRss(sampleRss)

        assertEquals("코스피 강세 마감", articles[1].title)
    }

    @Test
    fun `pubDate 형식이 이상하면 예외 대신 null로 둔다`() {
        val articles = NewsRssClient.parseRss(sampleRss)

        assertNull(articles[1].pubDate)
    }
}
