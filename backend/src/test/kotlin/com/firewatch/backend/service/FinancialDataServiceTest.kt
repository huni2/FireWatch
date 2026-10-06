package com.firewatch.backend.service

import com.firewatch.backend.client.FinancialApiClient
import com.firewatch.backend.client.PreciousMetalPrices
import com.firewatch.backend.client.MarketIndices
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertFailsWith

class FinancialDataServiceTest {
    @Test fun `환율 제공처 실패가 정상 금 은 및 지수 값을 버리지 않는다`() {
        val client = mockk<FinancialApiClient>()
        every { client.fetchExchangeRates(any()) } throws IllegalStateException("offline")
        every { client.fetchPreciousMetalPrices() } returns PreciousMetalPrices(BigDecimal("2500"), BigDecimal("30"))
        every { client.fetchMarketIndices() } returns MarketIndices(BigDecimal("2700"), null, null, null, null, null, null)
        val result = FinancialDataService(client).fetchLatestSnapshot()
        assertEquals(BigDecimal("2500"), result.goldPrice)
        assertEquals(BigDecimal("2700"), result.kospi)
        assertNull(result.usdKrw)
    }
    @Test fun `모든 제공처 실패를 빈 정상 스냅샷으로 저장하지 않는다`() {
        val client = mockk<FinancialApiClient>()
        every { client.fetchExchangeRates(any()) } throws IllegalStateException("offline")
        every { client.fetchPreciousMetalPrices() } throws IllegalStateException("offline")
        every { client.fetchMarketIndices() } throws IllegalStateException("offline")
        assertFailsWith<IllegalStateException> { FinancialDataService(client).fetchLatestSnapshot() }
    }
}
