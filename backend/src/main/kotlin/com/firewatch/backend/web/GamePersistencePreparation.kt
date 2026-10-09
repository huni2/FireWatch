// 게임을 생성하지 않고 첫 세션 조회의 JPA 준비 비용을 서버 시작 단계로 옮긴다.
package com.firewatch.backend.web

import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.repository.GameSessionRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.SmartInitializingSingleton
import org.springframework.stereotype.Component
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import java.util.UUID

@Component
class GamePersistencePreparation(
    private val sessions: GameSessionRepository,
    private val transactionManager: PlatformTransactionManager,
) : SmartInitializingSingleton {
    internal final var prepared = false
        private set

    override fun afterSingletonsInstantiated() {
        val started = System.nanoTime()
        // This query uses FOR UPDATE; PostgreSQL forbids it in a read-only transaction.
        // Only a lookup is performed: no game service, INSERT, UPDATE, or audit call.
        TransactionTemplate(transactionManager).execute {
            sessions.findByDeviceIdAndStatus("preparation-${UUID.randomUUID()}", GameSessionStatus.ACTIVE)
        }
        prepared = true
        LoggerFactory.getLogger(javaClass).info("game_persistence_ready preparation_ms={}",
            (System.nanoTime() - started) / 1_000_000)
    }
}
