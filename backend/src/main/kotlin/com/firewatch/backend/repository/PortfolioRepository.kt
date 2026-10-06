package com.firewatch.backend.repository

import com.firewatch.backend.entity.*
import org.springframework.data.jpa.repository.JpaRepository

interface PortfolioRepository : JpaRepository<Portfolio, Long>
interface MarketQuoteRepository : JpaRepository<MarketQuote, String>
interface PortfolioRevisionRepository : JpaRepository<PortfolioRevision, Long> {
    fun deleteByOwnerId(ownerId: Long)
}
