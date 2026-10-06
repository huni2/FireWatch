package com.firewatch.backend.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant

@Entity
@Table(name = "portfolios")
class Portfolio(
    @Id var ownerId: Long = 0,
    @Version var version: Long = 0,
    var goal: String = "장기 자산 형성",
    var horizonMonths: Int = 60,
    var riskLevel: String = "BALANCED",
    var accountType: String = "GENERAL",
    var monthlyContribution: BigDecimal = BigDecimal.ZERO,
    var cash: BigDecimal = BigDecimal.ZERO,
    @Column(columnDefinition = "TEXT") var holdingsJson: String = "[]",
    var updatedAt: Instant = Instant.now(),
) {
    override fun toString() = "포트폴리오 v$version 변경"
}

@Entity
@Table(name = "market_quotes")
class MarketQuote(
    @Id var symbol: String = "",
    var price: BigDecimal = BigDecimal.ZERO,
    var asOf: Instant = Instant.now(),
    var collectedAt: Instant = Instant.now(),
)

@Entity
@Table(name = "portfolio_revisions")
class PortfolioRevision(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) var id: Long? = null,
    var ownerId: Long = 0,
    var revision: Long = 0,
    @Column(columnDefinition = "TEXT") var snapshotJson: String = "",
    var createdAt: Instant = Instant.now(),
)
