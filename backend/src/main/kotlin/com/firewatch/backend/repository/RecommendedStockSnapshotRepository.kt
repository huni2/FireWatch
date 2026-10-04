package com.firewatch.backend.repository

import com.firewatch.backend.entity.RecommendedStockSnapshot
import org.springframework.data.jpa.repository.JpaRepository

interface RecommendedStockSnapshotRepository : JpaRepository<RecommendedStockSnapshot, Long> {
    fun findAllByOrderByBriefingDateDesc(): List<RecommendedStockSnapshot>
}
