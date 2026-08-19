package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 순수 파싱 함수만 검증(네트워크 없음)
class FinancialApiClientTest {

    @Test
    fun `수출입은행 응답에서 USD, JPY(100), CNH를 뽑는다`() {
        val response = listOf(
            mapOf("result" to 1, "cur_unit" to "USD", "deal_bas_r" to "1,384.20", "cur_nm" to "미국 달러"),
            mapOf("result" to 1, "cur_unit" to "JPY(100)", "deal_bas_r" to "920.15", "cur_nm" to "일본 옌"),
            mapOf("result" to 1, "cur_unit" to "CNH", "deal_bas_r" to "190.55", "cur_nm" to "위안화"),
            mapOf("result" to 1, "cur_unit" to "EUR", "deal_bas_r" to "1,500.00", "cur_nm" to "유로"),
        )

        val rates = FinancialApiClient.parseExchangeRates(response)

        assertEquals(BigDecimal("1384.20"), rates.usdKrw)
        assertEquals(BigDecimal("920.15"), rates.jpy100Krw)
        assertEquals(BigDecimal("190.55"), rates.cnyKrw)
    }

    @Test
    fun `result가 1이 아닌 항목은 무시한다`() {
        val response = listOf(
            mapOf("result" to 3, "cur_unit" to null, "deal_bas_r" to null),
        )

        assertFailsWith<IllegalStateException> {
            FinancialApiClient.parseExchangeRates(response)
        }
    }

    @Test
    fun `찾는 통화가 없으면 해당 필드는 null이다`() {
        val response = listOf(
            mapOf("result" to 1, "cur_unit" to "USD", "deal_bas_r" to "1,384.20"),
        )

        val rates = FinancialApiClient.parseExchangeRates(response)

        assertEquals(BigDecimal("1384.20"), rates.usdKrw)
        assertEquals(null, rates.jpy100Krw)
        assertEquals(null, rates.cnyKrw)
    }

    @Test
    fun `Yahoo 응답에서 regularMarketPrice를 뽑는다`() {
        val response = mapOf(
            "chart" to mapOf(
                "result" to listOf(mapOf("meta" to mapOf("regularMarketPrice" to 4406.1))),
            ),
        )

        val price = FinancialApiClient.parseYahooPrice(response, "GC=F")

        assertEquals(BigDecimal("4406.1"), price)
    }

    @Test
    fun `Yahoo 응답에 meta가 없으면 예외를 던진다`() {
        assertFailsWith<IllegalStateException> {
            FinancialApiClient.parseYahooPrice(mapOf("chart" to mapOf("result" to emptyList<Any>())), "SI=F")
        }
    }
}
