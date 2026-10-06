package com.firewatch.backend.repository

import com.firewatch.backend.entity.UserSettings
import org.springframework.stereotype.Component

/**
 * Design Ref: 공개 배포 전환(2026-09) — GET/PUT /api/settings 양쪽이 공유하는 "이 기기의 설정 행을
 * 찾거나 만든다" 로직. `service` 패키지가 아니라 여기(repository) 둔 이유는 단순 조회·생성까지
 * AuditLogAspect가 매 요청마다 USER_SETTING 이벤트로 남기면(설정 읽기만 해도 로그가 쌓임) 노이즈가
 * 되기 때문 — 실제 "설정을 바꿨다"(SettingsService.update)·"계정을 연동했다"(AuthService)만 감사한다.
 */
@Component
class SettingsIdentityResolver(
    private val userSettingsRepository: UserSettingsRepository,
    private val deviceLinkRepository: DeviceLinkRepository,
    private val appUserRepository: AppUserRepository,
) {
    fun resolveForDevice(deviceId: String): UserSettings {
        val link = deviceLinkRepository.findById(deviceId).orElse(null)
        if (link != null) {
            return userSettingsRepository.findByUserId(link.userId)
                ?: userSettingsRepository.save(UserSettings(userId = link.userId))
        }
        return userSettingsRepository.findByDeviceId(deviceId)
            ?: userSettingsRepository.save(UserSettings(deviceId = deviceId))
    }

    // GET/PUT /api/settings, POST /api/auth/google/link가 응답에 연동 이메일을 실어 보내기 위해 공유한다.
    fun linkedEmailFor(settings: UserSettings): String? =
        settings.userId?.let { appUserRepository.findById(it).orElse(null)?.email }
}
