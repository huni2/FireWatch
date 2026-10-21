// AI 장애 중 기본 브리핑에 확보한 자료와 시각만 표시하고 정상 원문은 보존하는지 검증한다.
package com.firewatch.backend.web

import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.NewsArticle
import com.firewatch.backend.web.dto.toResponse
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import kotlin.test.*

class BasicBriefingTest {
    @Test fun `옛 FALLBACK도 DB를 수정하지 않고 뉴스 지표와 시각을 제공한다`() {
        val stored = Briefing(id = 1, briefingDate = LocalDate.of(2026, 10, 21), marketSummary = "AI 브리핑 생성에 실패했습니다.",
            dataSourceStatus = DataSourceStatus.FALLBACK, kospi = BigDecimal("2700"), createdAt = Instant.parse("2026-10-20T22:00:00Z"))
        val news = listOf(NewsArticle(briefingId = 1, title = "확보한 실제 기사", link = "https://example.com/one", pubDate = Instant.parse("2026-10-20T23:00:00Z")))
        val response = stored.toResponse(news)
        assertTrue(response.marketSummary.contains("기본 시장 브리핑"))
        assertTrue(response.marketSummary.contains("2026-10-21 07:00"))
        assertTrue(response.marketSummary.contains("코스피: 2700"))
        assertTrue(response.marketSummary.contains("원/달러: 자료 미확보"))
        assertTrue(response.marketSummary.contains("확보한 실제 기사 · 2026-10-21 08:00"))
        assertEquals("AI 브리핑 생성에 실패했습니다.", stored.marketSummary)
        assertEquals(DataSourceStatus.FALLBACK, response.dataSourceStatus)
        stored.dataSourceStatus = DataSourceStatus.NORMAL
        stored.marketSummary = "정상 AI 해설 원문"
        assertEquals("정상 AI 해설 원문", stored.toResponse(news).marketSummary)
    }
}
