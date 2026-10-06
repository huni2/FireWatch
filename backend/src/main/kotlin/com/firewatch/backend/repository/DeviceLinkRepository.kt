package com.firewatch.backend.repository

import com.firewatch.backend.entity.DeviceLink
import org.springframework.data.jpa.repository.JpaRepository

interface DeviceLinkRepository : JpaRepository<DeviceLink, String> {
    fun deleteByUserId(userId: Long)
}
