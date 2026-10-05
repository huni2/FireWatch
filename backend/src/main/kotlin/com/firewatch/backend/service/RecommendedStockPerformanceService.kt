package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.StockRange
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.repository.RecommendedStockSnapshotRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

data class RecommendedStockPerformance(
    val stockName: String,
    val symbol: String?,
    val briefingDate: LocalDate,
    val priceAtRecommendation: BigDecimal?,
    val currentPrice: BigDecimal?,
    val returnPercent: BigDecimal?,
) {
    // fetchPerformance()가 List<RecommendedStockPerformance>를 그대로 반환해, AuditLogAspect의
    // 감사로그 응답요약에 "RecommendedStockPerformance(stockName=..., symbol=null, ...)" 원시 덤프가
    // 그대로 남던 문제(2026-10-05 지적) — 사람이 읽는 한 줄 형식으로.
    override fun toString(): String {
        val pct = returnPercent?.let { "${if (it > BigDecimal.ZERO) "+" else ""}${it}%" } ?: "현재가 조회 실패"
        return "$stockName($briefingDate 추천) $pct"
    }
}

// Design Ref: BE-13 — "AI 추천을 왜 믿어야 하나"에 답을 주는 조회 전용 API(WEB-10이 이걸 보여준다).
// 같은 symbol이 여러 날 추천됐으면 현재가를 한 번만 조회해 재사용 — 스냅샷이 쌓일수록 중복 Yahoo
// 호출이 늘어나는 걸 막는다.
@Service
class RecommendedStockPerformanceService(
    private val stockService: StockService,
    private val recommendedStockSnapshotRepository: RecommendedStockSnapshotRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FINANCIAL_API

    fun fetchPerformance(): List<RecommendedStockPerformance> {
        val snapshots = recommendedStockSnapshotRepository.findAllByOrderByBriefingDateDesc()
        val currentPriceBySymbol = snapshots.mapNotNull { it.symbol }.distinct().associateWith { symbol ->
            runCatching { stockService.fetchPriceHistory(symbol, StockRange.DAY).points.lastOrNull()?.close }
                .getOrNull()
        }

        return snapshots.map { snapshot ->
            val currentPrice = snapshot.symbol?.let { currentPriceBySymbol[it] }
            RecommendedStockPerformance(
                stockName = snapshot.stockName,
                symbol = snapshot.symbol,
                briefingDate = snapshot.briefingDate,
                priceAtRecommendation = snapshot.priceAtRecommendation,
                currentPrice = currentPrice,
                returnPercent = calculateReturnPercent(snapshot.priceAtRecommendation, currentPrice),
            )
        }
    }

    private fun calculateReturnPercent(priceAtRecommendation: BigDecimal?, currentPrice: BigDecimal?): BigDecimal? {
        if (priceAtRecommendation == null || currentPrice == null || priceAtRecommendation == BigDecimal.ZERO) {
            return null
        }
        return currentPrice.subtract(priceAtRecommendation)
            .divide(priceAtRecommendation, 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal(100))
    }
}
