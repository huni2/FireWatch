package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.interestKeywords
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant

// Design Ref: §4.2 PUT /api/settings 요청/응답, §5.4 최대 20개 키워드
data class SettingsUpdateRequest(
    @field:Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "HH:mm 형식이어야 합니다")
    val pushTime: String,
    @field:Size(max = 20, message = "관심 키워드는 최대 20개까지입니다")
    val interestKeywords: List<@Size(max = 30, message = "키워드는 30자를 넘을 수 없습니다") String> = emptyList(),
)

data class SettingsResponse(
    val pushTime: String,
    val interestKeywords: List<String>,
    val updatedAt: Instant,
)

fun UserSettings.toResponse() = SettingsResponse(
    pushTime = pushTime,
    interestKeywords = interestKeywords(),
    updatedAt = updatedAt,
)
