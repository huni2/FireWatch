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
)

// Design Ref: §2.2 — 환율 API와 금/은 시세를 하나로 묶어 FINANCIAL_API 이벤트로 감사 기록.
@Service
class FinancialDataService(
    private val financialApiClient: FinancialApiClient,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API

    // 환율/금은 중 하나라도 실패하면 예외를 그대로 던진다(부분 성공 데이터는 버림 — 단순화, TODO: 필요해지면 부분 응답 지원).
    fun fetchLatestSnapshot(): FinancialSnapshot {
        val rates = financialApiClient.fetchExchangeRates()
        val metals = financialApiClient.fetchPreciousMetalPrices()
        val indices = financialApiClient.fetchMarketIndices()
        return FinancialSnapshot(
            goldPrice = metals.goldPriceUsd,
            silverPrice = metals.silverPriceUsd,
            usdKrw = rates.usdKrw,
            jpy100Krw = rates.jpy100Krw,
            cnyKrw = rates.cnyKrw,
            kospi = indices.kospi,
            kosdaq = indices.kosdaq,
            sp500 = indices.sp500,
            nasdaq = indices.nasdaq,
            dow = indices.dow,
            usBondYield10y = indices.usBondYield10y,
        )
    }
}
