package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.audit.HasClientIp
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.UnauthorizedException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Instant

// API 키 검증을 이 안(감사 대상 메서드)에서 하는 이유: 컨트롤러에서 미리 걸러버리면
// 인증 실패 자체가 AuditLogAspect를 안 거쳐 감사로그에 남지 않는다 — Design §4.2 401 요구사항.
data class SettingsUpdateCommand(
    val pushTime: String,
    val interestKeywords: List<String>,
    val watchedStocks: List<String> = emptyList(),
    val apiKey: String?,
    override val clientIp: String?,
) : HasClientIp

@Service
class SettingsService(
    private val userSettingsRepository: UserSettingsRepository,
    @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String,
) : AuditedComponent {
    override val auditEventType = AuditEventType.USER_SETTING

    fun update(command: SettingsUpdateCommand): UserSettings {
        if (expectedApiKey.isBlank() || command.apiKey != expectedApiKey) {
            throw UnauthorizedException()
        }

        val settings = userSettingsRepository.findById(SINGLETON_SETTINGS_ID)
            .orElseGet { UserSettings(id = SINGLETON_SETTINGS_ID) }
        settings.pushTime = command.pushTime
        settings.interestKeywordsRaw = command.interestKeywords.toCommaSeparated()
        settings.watchedStocksRaw = command.watchedStocks.toCommaSeparated()
        settings.updatedAt = Instant.now()
        return userSettingsRepository.save(settings)
    }
}
