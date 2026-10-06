package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.audit.HasClientIp
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.WebPushSubscription
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.entity.toJsonString
import com.firewatch.backend.entity.webPushSubscriptions
import com.firewatch.backend.repository.SettingsIdentityResolver
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.ValidationException
import org.springframework.stereotype.Service
import java.time.Instant

// Design Ref: 공개 배포 전환(2026-09) — 쓰기 권한은 더 이상 공유 API 키가 아니라 "이 deviceId를
// 안다"는 사실 자체다(기기마다 다른 값이라 web/mobile 클라이언트 번들에 공유 비밀을 박아둘 필요가
// 없어짐 — 예전 SETTINGS_API_KEY 노출 문제가 이 구조로 자연히 해소됨, ADR 0004는 폐기).
data class SettingsUpdateCommand(
    val deviceId: String,
    val pushTime: String? = null,
    val interestKeywords: List<String>? = null,
    val watchedStocks: List<String>? = null,
    val fcmToken: String? = null,
    val webPushSubscription: WebPushSubscription? = null,
    override val clientIp: String?,
) : HasClientIp {
    override fun toString() = "설정 일부 변경"
}

@Service
class SettingsService(
    private val identityResolver: SettingsIdentityResolver,
    private val userSettingsRepository: UserSettingsRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.USER_SETTING

    fun update(command: SettingsUpdateCommand): UserSettings {
        // Kotlin의 `List<@Pattern String>` 타입-인자 애노테이션은 Jakarta Bean Validation이 실제로
        // 검증하지 않는다(2026-08-21 실측 확인 — 프로덕션에 유효하지 않은 값이 그대로 저장됨). 그래서
        // 컨테이너 요소 검증은 여기서 직접 한다.
        val invalidTickers = command.watchedStocks.orEmpty().filterNot { TICKER_PATTERN.matches(it) }
        if (invalidTickers.isNotEmpty()) {
            throw ValidationException(
                "입력값이 올바르지 않습니다.",
                mapOf("watchedStocks" to "티커 형식이 아닙니다: ${invalidTickers.joinToString(", ")}"),
            )
        }

        val settings = identityResolver.resolveForDevice(command.deviceId)
        command.pushTime?.let { settings.pushTime = it }
        command.interestKeywords?.let {
            if (it.any { keyword -> keyword.isBlank() || keyword.length > 30 || keyword.contains(',') }) throw ValidationException("키워드는 1~30자이며 쉼표를 포함할 수 없습니다.", mapOf("interestKeywords" to "형식 확인"))
            settings.interestKeywordsRaw = it.distinct().toCommaSeparated()
        }
        command.watchedStocks?.let { settings.watchedStocksRaw = it.distinct().toCommaSeparated() }
        if (!command.fcmToken.isNullOrBlank()) {
            val existingTokens = settings.fcmTokens()
            if (command.fcmToken !in existingTokens) {
                settings.fcmTokensRaw = (existingTokens + command.fcmToken).toCommaSeparated()
            }
        }
        if (command.webPushSubscription != null) {
            val existingSubscriptions = settings.webPushSubscriptions()
            val newEndpoint = command.webPushSubscription.endpoint
            if (existingSubscriptions.none { it.endpoint == newEndpoint }) {
                settings.webPushSubscriptionsRaw = (existingSubscriptions + command.webPushSubscription).toJsonString()
            }
        }
        settings.updatedAt = Instant.now()
        return userSettingsRepository.save(settings)
    }

    companion object {
        private val TICKER_PATTERN = Regex("^[A-Za-z0-9]+(\\.[A-Za-z0-9]+)?$")
    }
}
