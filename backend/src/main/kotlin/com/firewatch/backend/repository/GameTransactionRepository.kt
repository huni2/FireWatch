package com.firewatch.backend.repository

import com.firewatch.backend.entity.GameTransaction
import org.springframework.data.jpa.repository.JpaRepository

interface GameTransactionRepository : JpaRepository<GameTransaction, Long> {
    fun findBySessionIdAndTurnIndexLessThanEqual(sessionId: Long, turnIndex: Int): List<GameTransaction>
}
