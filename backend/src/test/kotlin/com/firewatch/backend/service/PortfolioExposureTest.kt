package com.firewatch.backend.service

import com.firewatch.backend.web.dto.PortfolioHoldingInput
import com.firewatch.backend.web.dto.PortfolioHoldingView
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.*

class PortfolioExposureTest {
    private fun view(name: String, cost: String?, currency: String = "KRW", asset: String = "STOCK", index: String = "") = PortfolioHoldingView(
        PortfolioHoldingInput(name, name, BigDecimal.ONE, BigDecimal.ONE, currency, asset, "반도체", "KR", index), cost?.toBigDecimal(), null, cost?.toBigDecimal(), null, null)

    @Test
    fun `현금을 포함해 비중을 계산하고 ETF 분야를 기업과 섞지 않는다`() {
        val result = PortfolioExposureAnalysis.analyze(listOf(view("회사", "600"), view("ETF", "200", "USD", "ETF")), "200".toBigDecimal())
        assertEquals("60.00".toBigDecimal(), result.sectorWeights["반도체"])
        assertEquals("20.00".toBigDecimal(), result.sectorWeights["ETF 구성 미확인"])
        assertEquals("80.00".toBigDecimal(), result.tradingCurrencyWeights["KRW"])
        assertEquals("20.00".toBigDecimal(), result.tradingCurrencyWeights["USD"])
        assertEquals("-20.00".toBigDecimal(), result.usdFxDown10ImpactKrw)
        assertEquals("회사", result.largestHoldings.first().name)
    }
    @Test
    fun `환율 누락을 0원으로 처리하지 않으며 지수명 표기 차이는 합친다`() {
        val result = PortfolioExposureAnalysis.analyze(listOf(view("ETF1", null, "USD", "ETF", "S&P 500"), view("ETF2", "100", "KRW", "ETF", "S&P500")), BigDecimal.ZERO)
        assertFalse(result.complete)
        assertEquals("100.00".toBigDecimal(), result.sectorWeights["ETF 구성 미확인"])
        assertNull(result.usdFxDown10ImpactKrw)
        assertEquals(listOf("ETF1", "ETF2"), result.indexOverlaps.single().names)
    }
    @Test
    fun `시세 비중은 매입가와 독립적이고 매입가 미입력도 계산한다`() {
        val first = view("회사", "100").copy(valueKrw = "900".toBigDecimal())
        val second = view("다른회사", "500").copy(holding = view("다른회사", "500").holding.copy(averageCost = null), investedKrw = null, valueKrw = "100".toBigDecimal())
        val result = PortfolioExposureAnalysis.analyze(listOf(first, second), BigDecimal.ZERO)
        assertTrue(result.complete)
        assertEquals("90.00".toBigDecimal(), result.largestHoldings.first().weightPercent)
        assertEquals("회사", result.largestHoldings.first().name)
    }
    @Test
    fun `빈 기록과 현금만 있는 기록도 나누기 오류 없이 계산한다`() {
        assertEquals(BigDecimal.ZERO, PortfolioExposureAnalysis.analyze(emptyList(), BigDecimal.ZERO).sectorWeights["현금"])
        assertEquals("100.00".toBigDecimal(), PortfolioExposureAnalysis.analyze(emptyList(), "100".toBigDecimal()).sectorWeights["현금"])
    }
}
