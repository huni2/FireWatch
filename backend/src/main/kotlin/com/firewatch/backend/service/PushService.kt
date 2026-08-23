package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.FcmSender
import com.firewatch.backend.client.WebPushSender
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.entity.toJsonString
import com.firewatch.backend.entity.webPushSubscriptions
import com.firewatch.backend.repository.UserSettingsRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

// 명세서 FR-07 "전체 발송 수, 성공 수" — AuditLogAspect가 반환값을 response_summary에 그대로 남기므로
// 이 데이터 클래스의 toString()이 곧 감사로그 내용이 된다(별도 감사 호출 불필요). 웹 푸시 필드(2026-08-24
// 확장)도 같은 이유로 기본값을 둬 채널 하나만 있어도 자연스럽게 읽힌다.
data class PushSendResult(
    val tokenCount: Int,
    val successCount: Int,
    val webPushSubscriberCount: Int = 0,
    val webPushSuccessCount: Int = 0,
)

/**
 * Design Ref: §2.2 — FR-03 "발송". 모바일 앱(FCM)과 브라우저(Web Push) 두 채널을 각각 시도하고,
 * 한쪽이 비어있어도(등록된 토큰/구독이 없어도) 나머지 채널은 정상 발송한다 — 앱만 쓰거나 브라우저만
 * 구독한 경우 둘 다 흔한 상태이기 때문.
 */
@Service
class PushService(
    private val fcmSender: FcmSender,
    private val webPushSender: WebPushSender,
    private val userSettingsRepository: UserSettingsRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FCM_PUSH

    private val log = LoggerFactory.getLogger(PushService::class.java)

    fun sendBriefingNotification(briefing: Briefing): PushSendResult {
        val settings = userSettingsRepository.findById(SINGLETON_SETTINGS_ID).orElse(null)
            ?: return PushSendResult(tokenCount = 0, successCount = 0)

        val title = "FireWatch 오늘의 브리핑"
        val body = briefing.marketSummary.take(NOTIFICATION_BODY_MAX_LENGTH)
        var settingsChanged = false

        val tokens = settings.fcmTokens()
        val fcmResult = if (tokens.isEmpty()) {
            log.info("등록된 FCM 토큰이 없어 발송 스킵")
            null
        } else {
            val result = fcmSender.sendMulticast(tokens = tokens, title = title, body = body)
            if (result.invalidTokens.isNotEmpty()) {
                settings.fcmTokensRaw = (tokens - result.invalidTokens.toSet()).toCommaSeparated()
                settingsChanged = true
                log.info("무효 FCM 토큰 ${result.invalidTokens.size}건 정제")
            }
            log.info("FCM 발송 완료: ${result.successCount}/${tokens.size}건 성공")
            result
        }

        val subscriptions = settings.webPushSubscriptions()
        val webPushResult = if (subscriptions.isEmpty()) {
            log.info("등록된 웹 푸시 구독이 없어 발송 스킵")
            null
        } else {
            val result = webPushSender.sendToAll(subscriptions, title = title, body = body)
            if (result.invalidEndpoints.isNotEmpty()) {
                val invalidSet = result.invalidEndpoints.toSet()
                settings.webPushSubscriptionsRaw = subscriptions.filterNot { it.endpoint in invalidSet }.toJsonString()
                settingsChanged = true
                log.info("무효 웹 푸시 구독 ${result.invalidEndpoints.size}건 정제")
            }
            log.info("웹 푸시 발송 완료: ${result.successCount}/${subscriptions.size}건 성공")
            result
        }

        if (settingsChanged) userSettingsRepository.save(settings)

        return PushSendResult(
            tokenCount = tokens.size,
            successCount = fcmResult?.successCount ?: 0,
            webPushSubscriberCount = subscriptions.size,
            webPushSuccessCount = webPushResult?.successCount ?: 0,
        )
    }

    companion object {
        private const val NOTIFICATION_BODY_MAX_LENGTH = 200
    }
}
