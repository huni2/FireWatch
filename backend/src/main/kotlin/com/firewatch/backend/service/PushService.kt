package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.FcmSender
import com.firewatch.backend.client.WebPushSender
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.entity.toJsonString
import com.firewatch.backend.entity.webPushSubscriptions
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.SchedulerController
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.LocalTime

// 명세서 FR-07 "전체 발송 수, 성공 수" — AuditLogAspect가 반환값을 response_summary에 그대로 남기므로
// 이 데이터 클래스의 toString()이 곧 감사로그 내용이 된다(별도 감사 호출 불필요). 그래서 data class
// 기본 toString()(생성자 형태 그대로 노출돼 읽기 불편하다는 2026-09-28 지적, BE-14)이 아니라
// 사람이 읽기 좋은 문장을 직접 반환하도록 오버라이드한다.
data class PushSendResult(
    val recipientCount: Int,
    val tokenCount: Int,
    val successCount: Int,
    val webPushSubscriberCount: Int = 0,
    val webPushSuccessCount: Int = 0,
) {
    override fun toString(): String =
        "대상 ${recipientCount}명 — FCM ${successCount}/${tokenCount}건, 웹푸시 ${webPushSuccessCount}/${webPushSubscriberCount}건 성공"
}

/**
 * Design Ref: §2.2 — FR-03 "발송". 공개 배포 전환(2026-09) 이후로는 user_settings가 행 하나가
 * 아니라서(기기별/계정별로 여러 행), "오늘자 브리핑이 준비된 뒤 지금이 자기 pushTime인 행"만 골라
 * 보낸다. [com.firewatch.backend.web.SchedulerController]가 폴링마다 이 메서드를 부르는데, 이미
 * 오늘 보낸 행(`lastNotifiedDate`)은 다시 안 보내 중복 발송 없이 여러 번 호출해도 안전하다.
 */
@Service
class PushService(
    private val fcmSender: FcmSender,
    private val webPushSender: WebPushSender,
    private val userSettingsRepository: UserSettingsRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.FCM_PUSH

    private val log = LoggerFactory.getLogger(PushService::class.java)

    fun notifyOperator(settings: UserSettings, body: String): PushSendResult {
        val result = sendToOne(settings, "FireWatch 수집 장애", body.take(NOTIFICATION_BODY_MAX_LENGTH))
        userSettingsRepository.save(settings)
        return result
    }

    fun notifyFeedback(settings: UserSettings): PushSendResult {
        val result = sendToOne(settings, "FireWatch 새 피드백", "새 사용자 피드백이 접수됐습니다. 운영자 피드백 화면에서 확인해주세요.")
        userSettingsRepository.save(settings)
        return result
    }

    fun testOperatorNotification(settings: UserSettings): PushSendResult {
        val result = sendToOne(settings, "FireWatch 운영자 알림 테스트", "실제 수집 장애가 아닌 수신 확인용 알림입니다. 앱·브라우저에서 알림이 보이는지 확인해주세요.")
        userSettingsRepository.save(settings)
        if (result.successCount + result.webPushSuccessCount == 0) throw IllegalStateException("운영자 테스트 알림 발송에 실패했습니다. 알림 등록과 권한을 확인해주세요.")
        return result
    }

    fun notifyDueUsers(briefing: Briefing, now: LocalTime, pollWindowMinutes: Long, today: LocalDate): PushSendResult {
        val dueRows = userSettingsRepository.findAll()
            .filter { SchedulerController.isRowDue(it, now, pollWindowMinutes, today) }
        if (dueRows.isEmpty()) {
            return PushSendResult(recipientCount = 0, tokenCount = 0, successCount = 0)
        }

        val title = "FireWatch 오늘의 브리핑"
        val body = briefing.marketSummary.take(NOTIFICATION_BODY_MAX_LENGTH)

        var totalTokens = 0
        var totalSuccess = 0
        var totalWebSubscribers = 0
        var totalWebSuccess = 0

        dueRows.forEach { settings ->
            val result = sendToOne(settings, title, body)
            totalTokens += result.tokenCount
            totalSuccess += result.successCount
            totalWebSubscribers += result.webPushSubscriberCount
            totalWebSuccess += result.webPushSuccessCount
            if (result.successCount + result.webPushSuccessCount > 0 || result.tokenCount + result.webPushSubscriberCount == 0) {
                settings.lastNotifiedDate = today
            }
        }
        userSettingsRepository.saveAll(dueRows)
        log.info("${dueRows.size}개 행에 발송 시도 — 토큰 $totalSuccess/$totalTokens 성공")

        return PushSendResult(
            recipientCount = dueRows.size,
            tokenCount = totalTokens,
            successCount = totalSuccess,
            webPushSubscriberCount = totalWebSubscribers,
            webPushSuccessCount = totalWebSuccess,
        )
    }

    // 모바일 앱(FCM)과 브라우저(Web Push) 두 채널을 각각 시도하고, 한쪽이 비어있어도(등록된
    // 토큰/구독이 없어도) 나머지 채널은 정상 발송한다 — 앱만 쓰거나 브라우저만 구독한 경우 둘 다 흔하다.
    private fun sendToOne(settings: UserSettings, title: String, body: String): PushSendResult {
        val tokens = settings.fcmTokens()
        val fcmResult = if (tokens.isEmpty()) {
            null
        } else {
            val result = fcmSender.sendMulticast(tokens = tokens, title = title, body = body)
            if (result.invalidTokens.isNotEmpty()) {
                settings.fcmTokensRaw = (tokens - result.invalidTokens.toSet()).toCommaSeparated()
            }
            result
        }

        val subscriptions = settings.webPushSubscriptions()
        val webPushResult = if (subscriptions.isEmpty()) {
            null
        } else {
            val result = webPushSender.sendToAll(subscriptions, title = title, body = body)
            if (result.invalidEndpoints.isNotEmpty()) {
                val invalidSet = result.invalidEndpoints.toSet()
                settings.webPushSubscriptionsRaw = subscriptions.filterNot { it.endpoint in invalidSet }.toJsonString()
            }
            result
        }

        return PushSendResult(
            recipientCount = 1,
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
