package com.firewatch.backend.web

import com.firewatch.backend.repository.SettingsIdentityResolver
import com.firewatch.backend.service.AuthService
import com.firewatch.backend.web.dto.GoogleLinkRequest
import com.firewatch.backend.web.dto.SettingsResponse
import com.firewatch.backend.web.dto.toResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.ResponseStatus
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
class AuthController(
    private val authService: AuthService,
    private val identityResolver: SettingsIdentityResolver,
    private val sessions: com.firewatch.backend.repository.AuthSessions,
) {
    @PostMapping("/google/link")
    suspend fun linkGoogleAccount(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @RequestBody request: GoogleLinkRequest,
    ): SettingsResponse = withContext(Dispatchers.IO) {
        val settings = authService.linkGoogleAccount(deviceId = deviceId.requireDeviceId(), idToken = request.idToken)
        settings.toResponse(identityResolver.linkedEmailFor(settings)).copy(session = sessions.issue(deviceId.requireDeviceId()))
    }

    // Play 스토어 계정 삭제 요건(2026-10-06) — 연동된 계정과 그 공유 설정을 완전히 삭제한다.
    @DeleteMapping("/account")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun deleteAccount(@RequestHeader("X-Device-Id", required = false) deviceId: String?) {
        withContext(Dispatchers.IO) { authService.deleteAccount(deviceId.requireDeviceId()) }
    }

    @org.springframework.web.bind.annotation.GetMapping("/devices")
    suspend fun devices(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestHeader("Authorization", required = false) authorization: String?) =
        withContext(Dispatchers.IO) { sessions.devices(deviceId.requireDeviceId(), authorization) }

    @DeleteMapping("/devices/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun revoke(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestHeader("Authorization", required = false) authorization: String?, @org.springframework.web.bind.annotation.PathVariable id: String) {
        withContext(Dispatchers.IO) { authService.revokeDevice(deviceId.requireDeviceId(), authorization, id) }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun logout(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestHeader("Authorization", required = false) authorization: String?) {
        withContext(Dispatchers.IO) { authService.logout(deviceId.requireDeviceId(), authorization) }
    }
}
