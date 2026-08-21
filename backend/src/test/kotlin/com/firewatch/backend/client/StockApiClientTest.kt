package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

// Design Ref: 순수 파싱 함수만 검증(네트워크 없음), FinancialApiClientTest와 동일 패턴
class StockApiClientTest {

    @Test
    fun `timestamp와 close를 짝지어 날짜별 종가를 뽑는다`() {
        val response = mapOf(
            "chart" to mapOf(
                "result" to listOf(
                    mapOf(
                        "timestamp" to listOf(1755734400L, 1755820800L), // 2025-08-21, 2025-08-22 (UTC)
                        "indicators" to mapOf(
                            "quote" to listOf(mapOf("close" to listOf(172.4, 173.1))),
                        ),
                    ),
                ),
            ),
        )

        val history = StockApiClient.parseHistory(response, "AAPL")

        assertEquals("AAPL", history.symbol)
        assertEquals(2, history.points.size)
        assertEquals(BigDecimal("172.4"), history.points[0].close)
        assertEquals("2025-08-21T00:00:00Z", history.points[0].timestamp)
    }

    @Test
    fun `close가 null인 슬롯은 건너뛴다`() {
        val response = mapOf(
            "chart" to mapOf(
                "result" to listOf(
                    mapOf(
                        "timestamp" to listOf(1755734400L, 1755820800L),
                        "indicators" to mapOf(
                            "quote" to listOf(mapOf("close" to listOf(172.4, null))),
                        ),
                    ),
                ),
            ),
        )

        val history = StockApiClient.parseHistory(response, "AAPL")

        assertEquals(1, history.points.size)
    }

    @Test
    fun `유효한 포인트가 하나도 없으면 예외를 던진다`() {
        val response = mapOf(
            "chart" to mapOf(
                "result" to listOf(
                    mapOf(
                        "timestamp" to listOf(1755734400L),
                        "indicators" to mapOf("quote" to listOf(mapOf("close" to listOf(null)))),
                    ),
                ),
            ),
        )

        assertFailsWith<IllegalStateException> {
            StockApiClient.parseHistory(response, "AAPL")
        }
    }

    @Test
    fun `result가 없으면 예외를 던진다`() {
        assertFailsWith<IllegalStateException> {
            StockApiClient.parseHistory(mapOf("chart" to mapOf("result" to emptyList<Any>())), "005930.KS")
        }
    }

    @Test
    fun `검색 응답에서 심볼-이름-거래소를 뽑는다`() {
        val response = mapOf(
            "quotes" to listOf(
                mapOf(
                    "symbol" to "005930.KS",
                    "shortname" to "SamsungElec",
                    "longname" to "Samsung Electronics Co., Ltd.",
                    "exchDisp" to "Korea",
                ),
            ),
        )

        val results = StockApiClient.parseSearchResults(response)

        assertEquals(1, results.size)
        assertEquals("005930.KS", results[0].symbol)
        assertEquals("Samsung Electronics Co., Ltd.", results[0].name)
        assertEquals("Korea", results[0].exchange)
    }

    @Test
    fun `quotes가 없으면 빈 목록을 반환한다`() {
        assertEquals(emptyList(), StockApiClient.parseSearchResults(emptyMap()))
    }
}
