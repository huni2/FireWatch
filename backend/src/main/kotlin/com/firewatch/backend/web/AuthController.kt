package com.firewatch.backend.web

import com.firewatch.backend.service.AuthService
import com.firewatch.backend.web.dto.GoogleLinkRequest
import com.firewatch.backend.web.dto.SettingsResponse
import com.firewatch.backend.web.dto.toResponse
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

// Design Ref: 공개 배포 전환(2026-09) — 기기(X-Device-Id)를 Google 계정에 연동해 여러 기기 간
// 설정(관심 종목 등)을 동기화하는 선택 기능. 세션·토큰 발급이 없다 — 연동 후에도 계속 X-Device-Id로
// 식별하며, 그 기기가 어느 계정에 연동됐는지는 서버(device_links)가 기억한다.
@RestController
@RequestMapping("/api/auth")
class AuthController(private val authService: AuthService) {
    @PostMapping("/google/link")
    fun linkGoogleAccount(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @RequestBody request: GoogleLinkRequest,
    ): SettingsResponse =
        authService.linkGoogleAccount(deviceId = deviceId.requireDeviceId(), idToken = request.idToken).toResponse()
}
