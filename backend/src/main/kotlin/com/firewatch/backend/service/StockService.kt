package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockApiClient
import com.firewatch.backend.client.StockPriceHistory
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.client.StockSearchResult
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service

// Design Ref: FINANCIAL_API와 같은 외부 시세 API 계열이라 같은 이벤트 타입으로 감사 기록.
@Service
class StockService(
    private val stockApiClient: StockApiClient,
    private val catalog: com.firewatch.backend.repository.InstrumentCatalog,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API

    fun fetchPriceHistory(symbol: String, range: StockRange): StockPriceHistory =
        stockApiClient.fetchPriceHistory(symbol, range)

    fun search(query: String): List<StockSearchResult> {
        if (query.isBlank()) return emptyList()
        val saved = catalog.search(query).items.map { StockSearchResult(it.instrument.symbol, it.instrument.name, it.instrument.region) }
        // Known names/aliases are served without an external provider request.
        return saved.ifEmpty { stockApiClient.searchSymbols(query) }
    }
}
