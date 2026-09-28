package com.firewatch.backend.repository

import com.firewatch.backend.entity.UserSettings
import org.springframework.data.jpa.repository.JpaRepository

interface UserSettingsRepository : JpaRepository<UserSettings, Long> {
    fun findByDeviceId(deviceId: String): UserSettings?

    fun findByUserId(userId: Long): UserSettings?
}
