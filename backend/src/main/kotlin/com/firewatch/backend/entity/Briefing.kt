package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

// Design Ref: §3.1 — briefings (FR-06). recommendedStocks는 쉼표 구분 문자열로 저장(Do 단계 단순화 판단, §3.1 주석 참고)
@Entity
@Table(name = "briefings")
class Briefing(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "briefing_date", nullable = false, unique = true)
    var briefingDate: LocalDate,

    @Column(name = "market_summary", nullable = false)
    var marketSummary: String,

    @Column(name = "recommended_stocks")
    var recommendedStocksRaw: String? = null,

    @Column(name = "gold_price")
    var goldPrice: BigDecimal? = null,

    @Column(name = "silver_price")
    var silverPrice: BigDecimal? = null,

    @Column(name = "usd_krw")
    var usdKrw: BigDecimal? = null,

    @Column(name = "jpy100_krw")
    var jpy100Krw: BigDecimal? = null,

    @Column(name = "cny_krw")
    var cnyKrw: BigDecimal? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "data_source_status", nullable = false, length = 20)
    var dataSourceStatus: DataSourceStatus,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)

// Hibernate 엔티티 내부에 계산 프로퍼티를 두면 매핑 대상으로 오인될 수 있어 확장 함수로 분리
fun Briefing.recommendedStocks(): List<String> = recommendedStocksRaw.toStringList()
