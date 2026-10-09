package com.firewatch.backend.repository

import com.firewatch.backend.entity.GameSession
import com.firewatch.backend.entity.GameSessionStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import jakarta.persistence.LockModeType

interface GameSessionRepository : JpaRepository<GameSession, Long> {
    fun findByDeviceIdAndId(deviceId: String, id: Long): GameSession?
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByIdAndDeviceId(id: Long, deviceId: String): GameSession?
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByDeviceIdAndStatus(deviceId: String, status: GameSessionStatus): GameSession?
}
