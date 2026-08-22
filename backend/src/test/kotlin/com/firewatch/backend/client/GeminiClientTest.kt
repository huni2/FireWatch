package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — Gemini 응답 파싱 (네트워크 없이 순수 함수만 검증)
class GeminiClientTest {

    @Test
    fun `정상 응답에서 텍스트를 추출한다`() {
        val response = mapOf(
            "candidates" to listOf(
                mapOf(
                    "content" to mapOf(
                        "parts" to listOf(mapOf("text" to "코스피는 반도체 강세.")),
                    ),
                ),
            ),
        )

        val result = GeminiClient.parseResponse(response)

        assertEquals("코스피는 반도체 강세.", result.marketSummary)
    }

    @Test
    fun `parts가 여러 개면 줄바꿈으로 합친다`() {
        val response = mapOf(
            "candidates" to listOf(
                mapOf(
                    "content" to mapOf(
                        "parts" to listOf(
                            mapOf("text" to "첫 문단"),
                            mapOf("text" to "둘째 문단"),
                        ),
                    ),
                ),
            ),
        )

        val result = GeminiClient.parseResponse(response)

        assertEquals("첫 문단\n둘째 문단", result.marketSummary)
    }

    @Test
    fun `candidates가 없으면 예외를 던진다`() {
        assertFailsWith<IllegalStateException> {
            GeminiClient.parseResponse(emptyMap())
        }
    }

    @Test
    fun `마지막 줄의 추천종목을 뽑아내고 본문에서는 뺀다`() {
        val response = mapOf(
            "candidates" to listOf(
                mapOf(
                    "content" to mapOf(
                        "parts" to listOf(
                            mapOf("text" to "코스피는 반도체 강세.\n추천종목: 삼성전자, SK하이닉스"),
                        ),
                    ),
                ),
            ),
        )

        val result = GeminiClient.parseResponse(response)

        assertEquals("코스피는 반도체 강세.", result.marketSummary)
        assertEquals(listOf("삼성전자", "SK하이닉스"), result.recommendedStocks)
    }

    @Test
    fun `추천종목 줄이 없으면 빈 목록이고 본문은 그대로다`() {
        val response = mapOf(
            "candidates" to listOf(
                mapOf("content" to mapOf("parts" to listOf(mapOf("text" to "코스피는 반도체 강세.")))),
            ),
        )

        val result = GeminiClient.parseResponse(response)

        assertEquals("코스피는 반도체 강세.", result.marketSummary)
        assertEquals(emptyList(), result.recommendedStocks)
    }

    @Test
    fun `응답 텍스트가 비어있으면 예외를 던진다`() {
        val response = mapOf(
            "candidates" to listOf(
                mapOf("content" to mapOf("parts" to listOf(mapOf("text" to "  ")))),
            ),
        )

        assertFailsWith<IllegalStateException> {
            GeminiClient.parseResponse(response)
        }
    }

    @Test
    fun `프롬프트에 시세와 뉴스가 그대로 들어간다`() {
        val prompt = GeminiClient.buildPrompt(
            goldPrice = BigDecimal("4595.00"),
            silverPrice = BigDecimal("69.08"),
            usdKrw = BigDecimal("1402.50"),
            jpy100Krw = BigDecimal("886.45"),
            cnyKrw = BigDecimal("207.82"),
            kospi = BigDecimal("2912.95"),
            kosdaq = BigDecimal("801.94"),
            sp500 = BigDecimal("7674.37"),
            nasdaq = BigDecimal("26180.45"),
            dow = BigDecimal("53277.00"),
            usBondYield10y = BigDecimal("4.738"),
            newsArticles = listOf(
                NewsArticleResult(
                    title = "코스피 강세 마감",
                    link = "https://example.com/1",
                    description = "코스피가 2%대 강세로 마감했다.",
                    pubDate = Instant.now(),
                ),
            ),
        )

        assertTrue(prompt.contains("4595.00"))
        assertTrue(prompt.contains("1402.50"))
        assertTrue(prompt.contains("2912.95"))
        assertTrue(prompt.contains("53277.00"))
        assertTrue(prompt.contains("4.738"))
        assertTrue(prompt.contains("코스피 강세 마감"))
        assertTrue(prompt.contains("코스피가 2%대 강세로 마감했다."))
    }

    @Test
    fun `뉴스가 없으면 안내 문구로 대체한다`() {
        val prompt = GeminiClient.buildPrompt(
            goldPrice = null,
            silverPrice = null,
            usdKrw = null,
            jpy100Krw = null,
            cnyKrw = null,
            kospi = null,
            kosdaq = null,
            sp500 = null,
            nasdaq = null,
            dow = null,
            usBondYield10y = null,
            newsArticles = emptyList(),
        )

        assertTrue(prompt.contains("참고할 뉴스 데이터가 없습니다"))
        assertTrue(prompt.contains("정보 없음"))
    }
}
