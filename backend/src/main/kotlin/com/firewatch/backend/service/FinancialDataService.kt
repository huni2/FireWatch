package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.FinancialApiClient
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service
import java.math.BigDecimal

data class FinancialSnapshot(
    val goldPrice: BigDecimal?,
    val silverPrice: BigDecimal?,
    val usdKrw: BigDecimal?,
    val jpy100Krw: BigDecimal?,
    val cnyKrw: BigDecimal?,
    // 2026-08-23 사용자 요청 — 국내외 지수 + 미국채 수익률. 기존 생성 코드(테스트 등)가 안 깨지도록 기본값 null.
    val kospi: BigDecimal? = null,
    val kosdaq: BigDecimal? = null,
    val sp500: BigDecimal? = null,
    val nasdaq: BigDecimal? = null,
    val dow: BigDecimal? = null,
    val usBondYield10y: BigDecimal? = null,
    val krBondYield10y: BigDecimal? = null,
) {
    // fetchLatestSnapshot()이 이 값을 그대로 반환해, AuditLogAspect의 감사로그 응답요약에
    // "FinancialSnapshot(goldPrice=..., silverPrice=...)" 같은 필드명 그대로의 덤프가 남던 문제
    // (2026-10-05 지적) — 값이 없는 지표는 "—"로 표시.
    override fun toString(): String {
        fun fmt(label: String, value: BigDecimal?) = "$label ${value ?: "—"}"
        return listOf(
            fmt("금", goldPrice), fmt("은", silverPrice),
            fmt("USD/KRW", usdKrw), fmt("JPY100/KRW", jpy100Krw), fmt("CNY/KRW", cnyKrw),
            fmt("코스피", kospi), fmt("코스닥", kosdaq),
            fmt("S&P500", sp500), fmt("나스닥", nasdaq), fmt("다우", dow),
            fmt("미국채10Y", usBondYield10y), fmt("한국채10Y", krBondYield10y),
        ).joinToString(" · ")
    }
}

// Design Ref: §2.2 — 환율 API와 금/은 시세를 하나로 묶어 FINANCIAL_API 이벤트로 감사 기록.
@Service
class FinancialDataService(
    private val financialApiClient: FinancialApiClient,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API

    // Independent providers: one outage must not discard other successful observations.
    fun fetchLatestSnapshot(): FinancialSnapshot {
        val rates = runCatching { financialApiClient.fetchExchangeRates() }.getOrNull()
        val metals = runCatching { financialApiClient.fetchPreciousMetalPrices() }.getOrNull()
        val indices = runCatching { financialApiClient.fetchMarketIndices() }.getOrNull()
        check(rates != null || metals != null || indices != null) { "금융 자료 제공처가 모두 실패했습니다." }
        return FinancialSnapshot(
            goldPrice = metals?.goldPriceUsd,
            silverPrice = metals?.silverPriceUsd,
            usdKrw = rates?.usdKrw,
            jpy100Krw = rates?.jpy100Krw,
            cnyKrw = rates?.cnyKrw,
            kospi = indices?.kospi,
            kosdaq = indices?.kosdaq,
            sp500 = indices?.sp500,
            nasdaq = indices?.nasdaq,
            dow = indices?.dow,
            usBondYield10y = indices?.usBondYield10y,
            krBondYield10y = indices?.krBondYield10y,
        )
    }
}
