package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

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
}
