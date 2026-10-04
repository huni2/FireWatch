package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

// Design Ref: BE-13(2026-10-04 앱 리뷰) — "AI 추천을 왜 믿어야 하나"에 답을 주기 위한 가상매매 트래킹.
// 매일 SchedulerJob이 그날 Gemini가 추천한 종목마다 한 행씩 쌓는다(같은 종목이 여러 날 반복 추천되면
// 매번 새 행 — "그때 추천받았으면 지금 얼마인지"를 그 추천 시점마다 보여주는 게 목적이라 중복 제거 안 함).
// symbol/priceAtRecommendation이 null인 행은 종목명→티커 검색에 실패한 경우(StockApiClient.searchSymbols
// 결과 없음) — 성능 조회 시 건너뛴다.
@Entity
@Table(name = "recommended_stock_snapshots")
class RecommendedStockSnapshot(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "briefing_date", nullable = false)
    var briefingDate: LocalDate,

    @Column(name = "stock_name", nullable = false)
    var stockName: String,

    @Column(name = "symbol")
    var symbol: String? = null,

    @Column(name = "price_at_recommendation")
    var priceAtRecommendation: BigDecimal? = null,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)
