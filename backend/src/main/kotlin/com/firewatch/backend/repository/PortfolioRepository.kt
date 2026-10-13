package com.firewatch.backend.repository

import com.firewatch.backend.entity.*
import org.springframework.data.jpa.repository.JpaRepository

interface PortfolioRepository : JpaRepository<Portfolio, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Portfolio p where p.ownerId = :ownerId")
    fun findForAccountLink(ownerId: Long): Portfolio?
}
interface MarketQuoteRepository : JpaRepository<MarketQuote, String>
interface PortfolioRevisionRepository : JpaRepository<PortfolioRevision, Long> {
    fun deleteByOwnerId(ownerId: Long)
}
