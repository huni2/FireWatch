package com.firewatch.backend.service

import java.math.BigDecimal
import java.time.LocalDate
import java.time.YearMonth

data class DueContribution(val monthsApplied: Int, val amount: BigDecimal, val appliedThroughMonth: String)

/**
 * 매월 지정한 날짜에 월 추가 투자금만큼 보유 현금을 자동으로 늘려주는 계산.
 * 실제로 저장(DB 반영)하지는 않고, 반영해야 할 금액과 "어디까지 처리했는지"만 계산한다 — 저장은 호출부(PortfolioService) 책임.
 */
object PortfolioContribution {
    const val LAST_DAY_OF_MONTH = 99
    private const val MAX_BACKFILL_MONTHS = 12

    // lastAppliedMonth가 null이면(설정 직후) 아무것도 반영하지 않는다 — 호출부가 납입일을 켤 때 lastAppliedMonth를 이번 달로 미리 찍어,
    // "방금 설정했는데 이번 달 걸 소급으로 바로 받는" 놀람을 막는다. 다음 납입일부터 정상적으로 반영이 시작된다.
    fun due(contributionDay: Int?, monthlyContribution: BigDecimal, lastAppliedMonth: String?, today: LocalDate): DueContribution? {
        if (contributionDay == null || monthlyContribution <= BigDecimal.ZERO || lastAppliedMonth == null) return null
        val currentMonth = YearMonth.from(today)
        val last = YearMonth.parse(lastAppliedMonth)
        if (!last.isBefore(currentMonth)) return null
        var cursor = last.plusMonths(1)
        var months = 0
        var lastQualifying: YearMonth? = null
        while (!cursor.isAfter(currentMonth)) {
            val qualifies = if (cursor == currentMonth) today.dayOfMonth >= effectiveDay(contributionDay, currentMonth) else true
            if (!qualifies) break
            months++; lastQualifying = cursor; cursor = cursor.plusMonths(1)
        }
        if (months == 0 || lastQualifying == null) return null
        val paidMonths = minOf(months, MAX_BACKFILL_MONTHS)
        return DueContribution(paidMonths, monthlyContribution.multiply(BigDecimal(paidMonths)), lastQualifying.toString())
    }

    private fun effectiveDay(contributionDay: Int, month: YearMonth): Int =
        if (contributionDay == LAST_DAY_OF_MONTH) month.lengthOfMonth() else minOf(contributionDay, month.lengthOfMonth())
}
