package com.firewatch.backend.repository

import com.firewatch.backend.entity.GameSession
import com.firewatch.backend.entity.GameSessionStatus
import org.springframework.data.jpa.repository.JpaRepository

interface GameSessionRepository : JpaRepository<GameSession, Long> {
    fun findByDeviceIdAndStatus(deviceId: String, status: GameSessionStatus): GameSession?
}
