package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockApiClient
import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service

// Design Ref: FINANCIAL_API와 같은 외부 시세 API 계열이라 같은 이벤트 타입으로 감사 기록.
@Service
class StockService(
    private val stockApiClient: StockApiClient,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API

    fun fetchPriceHistory(symbol: String): StockPriceHistory = stockApiClient.fetchPriceHistory(symbol)
}
