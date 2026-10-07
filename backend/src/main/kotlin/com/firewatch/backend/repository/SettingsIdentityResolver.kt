package com.firewatch.backend.repository

import com.firewatch.backend.entity.UserSettings
import org.springframework.stereotype.Component
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.dao.DuplicateKeyException

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
    private val jdbc: JdbcTemplate,
    @Value("\${spring.sql.init.platform:h2}") private val databasePlatform: String,
) {
    fun resolveForDevice(deviceId: String): UserSettings {
        val link = deviceLinkRepository.findById(deviceId).orElse(null)
        if (link != null) {
            return userSettingsRepository.findByUserId(link.userId)
                ?: userSettingsRepository.save(UserSettings(userId = link.userId))
        }
        userSettingsRepository.findByDeviceId(deviceId)?.let { return it }
        val candidate = UserSettings(deviceId = deviceId)
        // Do not overwrite an existing row, and let the DB arbitrate concurrent first visits.
        // No nested transaction/extra pooled connection is needed on the production path.
        if (databasePlatform == "postgresql") {
            jdbc.update("INSERT INTO user_settings (id, device_id, push_time, updated_at) VALUES (?, ?, '08:00', CURRENT_TIMESTAMP) ON CONFLICT (device_id) DO NOTHING", candidate.id, deviceId)
        } else {
            // H2 MERGE may race after checking NOT MATCHED. H2 keeps the transaction
            // usable after this JDBC constraint error; PostgreSQL uses ON CONFLICT above.
            try {
                jdbc.update("MERGE INTO user_settings t USING (VALUES (?, ?)) s(id, device_id) ON t.device_id=s.device_id WHEN NOT MATCHED THEN INSERT (id, device_id, push_time, updated_at) VALUES (s.id, s.device_id, '08:00', CURRENT_TIMESTAMP)", candidate.id, deviceId)
            } catch (error: DuplicateKeyException) {
                return userSettingsRepository.findByDeviceId(deviceId) ?: throw error
            }
        }
        return userSettingsRepository.findByDeviceId(deviceId) ?: error("기기 설정 생성 결과를 확인할 수 없습니다.")
    }

    // GET/PUT /api/settings, POST /api/auth/google/link가 응답에 연동 이메일을 실어 보내기 위해 공유한다.
    fun linkedEmailFor(settings: UserSettings): String? =
        settings.userId?.let { appUserRepository.findById(it).orElse(null)?.email }
}
