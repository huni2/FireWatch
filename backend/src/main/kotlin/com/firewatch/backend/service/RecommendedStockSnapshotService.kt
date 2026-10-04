package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.RecommendedStockSnapshot
import com.firewatch.backend.repository.RecommendedStockSnapshotRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDate

// Design Ref: BE-13 — 그날 Gemini가 추천한 종목마다 이름→티커 검색 후 그 시점 가격을 스냅샷으로 남긴다.
// 종목 하나가 실패(검색 결과 없음·가격 조회 실패)해도 나머지는 계속 저장 — SchedulerJob의 다른 외부
// API 호출과 같은 "부분 실패 허용" 원칙(FinancialApiClient 등과 동일).
@Service
class RecommendedStockSnapshotService(
    private val stockService: StockService,
    private val recommendedStockSnapshotRepository: RecommendedStockSnapshotRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API

    private val log = LoggerFactory.getLogger(RecommendedStockSnapshotService::class.java)

    fun saveSnapshots(briefingDate: LocalDate, stockNames: List<String>) {
        stockNames.forEach { name ->
            runCatching {
                val symbol = stockService.search(name).firstOrNull()?.symbol
                val price = symbol?.let {
                    stockService.fetchPriceHistory(it, StockRange.DAY).points.lastOrNull()?.close
                }
                recommendedStockSnapshotRepository.save(
                    RecommendedStockSnapshot(
                        briefingDate = briefingDate,
                        stockName = name,
                        symbol = symbol,
                        priceAtRecommendation = price,
                    ),
                )
            }.onFailure { log.warn("추천종목 스냅샷 저장 실패(종목: $name) — 나머지는 계속 진행", it) }
        }
    }
}
