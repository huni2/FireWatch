package com.firewatch.backend.entity

import jakarta.persistence.*
import java.math.BigDecimal

/** A confirmed price belongs to a session and turn, so retries cannot change a filled order's valuation. */
@Entity
@Table(name = "game_price_snapshots")
class GamePriceSnapshot(
    @Id @Column(length = 100) var id: String,
    @Column(nullable = false, precision = 20, scale = 4) var price: BigDecimal,
)
