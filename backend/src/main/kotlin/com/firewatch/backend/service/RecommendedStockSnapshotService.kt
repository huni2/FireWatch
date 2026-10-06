package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.RecommendedStockSnapshot
import com.firewatch.backend.repository.RecommendedStockSnapshotRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
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

    fun saveSnapshots(briefingDate: LocalDate, stockNames: List<String>, knownSymbols: Map<String, String> = emptyMap()) {
        stockNames.forEach { name ->
            runCatching {
                val (symbol, price) = resolveSymbolAndPrice(name, knownSymbols[name])
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

    // Yahoo 검색은 한글 종목명을 잘 못 알아듣고, 영문이어도 중소형주는 인덱스에서 빠져 있는 경우가
    // 있다(2026-10-06 실측 — "메타"·"스카이랩스" 둘 다 이름 검색으로는 못 찾았는데 스카이랩스는 티커를
    // 직접 입력하면 정상 조회됨). Gemini가 프롬프트에서 함께 준 티커가 있으면 검색 없이 바로 시도하고,
    // 가격 조회에 실패하면(모델이 틀린 티커를 줬을 수 있음) 기존 이름 검색으로 폴백한다.
    private fun resolveSymbolAndPrice(name: String, knownSymbol: String?): Pair<String?, BigDecimal?> {
        if (knownSymbol != null) {
            val price = runCatching {
                stockService.fetchPriceHistory(knownSymbol, StockRange.DAY).points.lastOrNull()?.close
            }.getOrNull()
            if (price != null) return knownSymbol to price
        }
        val searchedSymbol = stockService.search(name).firstOrNull()?.symbol
        val price = searchedSymbol?.let {
            runCatching { stockService.fetchPriceHistory(it, StockRange.DAY).points.lastOrNull()?.close }.getOrNull()
        }
        return searchedSymbol to price
    }
}
