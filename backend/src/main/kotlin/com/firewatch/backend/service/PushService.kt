package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.FcmSender
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.repository.UserSettingsRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

// 명세서 FR-07 "전체 발송 수, 성공 수" — AuditLogAspect가 반환값을 response_summary에 그대로 남기므로
// 이 데이터 클래스의 toString()이 곧 감사로그 내용이 된다(별도 감사 호출 불필요).
data class PushSendResult(val tokenCount: Int, val successCount: Int)

/**
 * Design Ref: §2.2 — FR-03 "발송"까지(Phase 1). 모바일 수신 UI·토큰 등록 화면은 Phase 2.
 * 지금은 등록된 토큰이 없는 게 정상이라(앱이 없으므로) 0건 발송으로 조용히 끝난다.
 */
@Service
class PushService(
    private val fcmSender: FcmSender,
    private val userSettingsRepository: UserSettingsRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FCM_PUSH

    private val log = LoggerFactory.getLogger(PushService::class.java)

    fun sendBriefingNotification(briefing: Briefing): PushSendResult {
        val settings = userSettingsRepository.findById(SINGLETON_SETTINGS_ID).orElse(null)
            ?: return PushSendResult(tokenCount = 0, successCount = 0)
        val tokens = settings.fcmTokens()
        if (tokens.isEmpty()) {
            log.info("등록된 FCM 토큰이 없어 발송 스킵")
            return PushSendResult(tokenCount = 0, successCount = 0)
        }

        val result = fcmSender.sendMulticast(
            tokens = tokens,
            title = "FireWatch 오늘의 브리핑",
            body = briefing.marketSummary.take(NOTIFICATION_BODY_MAX_LENGTH),
        )

        if (result.invalidTokens.isNotEmpty()) {
            val remaining = tokens - result.invalidTokens.toSet()
            settings.fcmTokensRaw = remaining.toCommaSeparated()
            userSettingsRepository.save(settings)
            log.info("무효 FCM 토큰 ${result.invalidTokens.size}건 정제")
        }

        log.info("FCM 발송 완료: ${result.successCount}/${tokens.size}건 성공")
        return PushSendResult(tokenCount = tokens.size, successCount = result.successCount)
    }

    companion object {
        private const val NOTIFICATION_BODY_MAX_LENGTH = 200
    }
}
