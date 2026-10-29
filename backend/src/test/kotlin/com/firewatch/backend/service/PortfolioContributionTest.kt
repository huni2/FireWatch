package com.firewatch.backend.service

import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.test.*

class PortfolioContributionTest {
    @Test
    fun `납입일을 막 설정했으면 lastAppliedMonth가 없어 아무것도 반영하지 않는다`() {
        assertNull(PortfolioContribution.due(5, "100000".toBigDecimal(), null, LocalDate.of(2026, 10, 20)))
    }

    @Test
    fun `같은 달이고 납입일이 아직 안 지났으면 반영하지 않는다`() {
        assertNull(PortfolioContribution.due(20, "100000".toBigDecimal(), "2026-09", LocalDate.of(2026, 10, 10)))
    }

    @Test
    fun `같은 달 납입일이 지났으면 한 달치를 반영한다`() {
        val due = PortfolioContribution.due(5, "100000".toBigDecimal(), "2026-09", LocalDate.of(2026, 10, 10))
        assertEquals(1, due?.monthsApplied)
        assertEquals("100000".toBigDecimal(), due?.amount)
        assertEquals("2026-10", due?.appliedThroughMonth)
    }

    @Test
    fun `7개월 밀려도 12개월 이내면 전부 반영한다`() {
        val due = PortfolioContribution.due(5, "100000".toBigDecimal(), "2026-03", LocalDate.of(2026, 10, 10))
        assertEquals(7, due?.monthsApplied)
        assertEquals("700000".toBigDecimal(), due?.amount)
        assertEquals("2026-10", due?.appliedThroughMonth)
    }

    @Test
    fun `25개월 밀리면 12개월치만 반영하고 나머지는 버리되 처리한 것으로 표시한다`() {
        val due = PortfolioContribution.due(5, "100000".toBigDecimal(), "2024-09", LocalDate.of(2026, 10, 10))
        assertEquals(12, due?.monthsApplied)
        assertEquals("1200000".toBigDecimal(), due?.amount)
        assertEquals("2026-10", due?.appliedThroughMonth)
    }

    @Test
    fun `매월 말일 설정은 2월에도 그 달의 마지막 날을 기준으로 한다`() {
        assertNull(PortfolioContribution.due(PortfolioContribution.LAST_DAY_OF_MONTH, "100000".toBigDecimal(), "2026-01", LocalDate.of(2026, 2, 27)))
        val due = PortfolioContribution.due(PortfolioContribution.LAST_DAY_OF_MONTH, "100000".toBigDecimal(), "2026-01", LocalDate.of(2026, 2, 28))
        assertEquals(1, due?.monthsApplied)
    }

    @Test
    fun `월 추가 투자금이 0이면 납입일이 지났어도 반영하지 않는다`() {
        assertNull(PortfolioContribution.due(5, BigDecimal.ZERO, "2026-09", LocalDate.of(2026, 10, 10)))
    }
}
