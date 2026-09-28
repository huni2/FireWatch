package com.firewatch.backend.web

import com.firewatch.backend.repository.SettingsIdentityResolver
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

// Design Ref: §4.1 — GET/PUT /api/settings. 공개 배포 전환(2026-09)으로 둘 다 X-Device-Id가
// 필요하다 — 예전엔 사용자가 하나뿐이라 GET이 인증 없이 그 하나를 그냥 돌려줬지만, 지금은 "누구의
// 설정인지" 알아야 한다. 쓰기 권한은 공유 API 키 대신 "이 deviceId를 안다"는 사실 자체다.
@RestController
@RequestMapping("/api/settings")
class SettingsController(
    private val identityResolver: SettingsIdentityResolver,
    private val settingsService: SettingsService,
    private val rateLimiter: SettingsRateLimiter,
) {
    @GetMapping
    suspend fun get(@RequestHeader("X-Device-Id", required = false) deviceId: String?): SettingsResponse =
        withContext(Dispatchers.IO) {
            identityResolver.resolveForDevice(deviceId.requireDeviceId()).toResponse()
        }

    @PutMapping
    suspend fun update(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @Valid @RequestBody request: SettingsUpdateRequest,
        exchange: ServerWebExchange,
    ): SettingsResponse = withContext(Dispatchers.IO) {
        val clientIp = exchange.request.remoteAddress?.address?.hostAddress
        if (!rateLimiter.allow(clientIp ?: "unknown")) {
            throw TooManyRequestsException()
        }
        val command = SettingsUpdateCommand(
            deviceId = deviceId.requireDeviceId(),
            pushTime = request.pushTime,
            interestKeywords = request.interestKeywords,
            watchedStocks = request.watchedStocks,
            fcmToken = request.fcmToken,
            webPushSubscription = request.webPushSubscription,
            clientIp = clientIp,
        )
        settingsService.update(command).toResponse()
    }
}
