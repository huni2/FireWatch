package com.firewatch.backend.web

import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.service.SettingsService
import com.firewatch.backend.service.SettingsUpdateCommand
import com.firewatch.backend.web.dto.SettingsResponse
import com.firewatch.backend.web.dto.SettingsUpdateRequest
import com.firewatch.backend.web.dto.toResponse
import jakarta.validation.Valid
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ServerWebExchange

// Design Ref: §4.1 — GET/PUT /api/settings. PUT은 X-API-Key 필요(ADR 0004).
@RestController
@RequestMapping("/api/settings")
class SettingsController(
    private val userSettingsRepository: UserSettingsRepository,
    private val settingsService: SettingsService,
) {
    @GetMapping
    suspend fun get(): SettingsResponse = withContext(Dispatchers.IO) {
        val settings = userSettingsRepository.findById(SINGLETON_SETTINGS_ID)
            .orElseGet { UserSettings(id = SINGLETON_SETTINGS_ID) }
        settings.toResponse()
    }

    @PutMapping
    suspend fun update(
        @RequestHeader("X-API-Key", required = false) apiKey: String?,
        @Valid @RequestBody request: SettingsUpdateRequest,
        exchange: ServerWebExchange,
    ): SettingsResponse = withContext(Dispatchers.IO) {
        val clientIp = exchange.request.remoteAddress?.address?.hostAddress
        val command = SettingsUpdateCommand(
            pushTime = request.pushTime,
            interestKeywords = request.interestKeywords,
            apiKey = apiKey,
            clientIp = clientIp,
        )
        settingsService.update(command).toResponse()
    }
}
