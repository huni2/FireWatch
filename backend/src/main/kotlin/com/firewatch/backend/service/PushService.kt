package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.FcmSender
import com.firewatch.backend.client.FcmSendResult
import com.firewatch.backend.client.WebPushSender
import com.firewatch.backend.client.WebPushSendResult
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.entity.toJsonString
import com.firewatch.backend.entity.webPushSubscriptions
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.SchedulerController
import com.firewatch.backend.web.ApiException
import org.springframework.http.HttpStatus
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
    val webPushFailureCodes: Set<String> = emptySet(),
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
        if (result.successCount + result.webPushSuccessCount == 0) {
            val guidance = when {
                "CONFIG_MISSING" in result.webPushFailureCodes -> "Render의 VAPID_PUBLIC_KEY·VAPID_PRIVATE_KEY·VAPID_SUBJECT 설정을 확인해주세요."
                "KEY_PAIR_MISMATCH" in result.webPushFailureCodes -> "Render의 VAPID_PRIVATE_KEY가 VAPID_PUBLIC_KEY와 짝이 아닙니다. 해당 공개키와 함께 생성한 비밀키를 설정해주세요."
                "KEY_FORMAT_INVALID" in result.webPushFailureCodes -> "Render의 VAPID 공개키·비밀키 형식이 올바르지 않습니다. 키 값의 공백·따옴표·누락을 확인해주세요."
                "AUTH_REJECTED" in result.webPushFailureCodes -> "서버 키 쌍은 확인됐지만 알림 제공처가 인증을 거절했습니다. 배포된 웹과 구독의 공개키·Render의 VAPID_SUBJECT를 확인해주세요."
                "SUBSCRIPTION_EXPIRED" in result.webPushFailureCodes -> "브라우저 알림 구독이 만료됐습니다. 이 브라우저에서 알림을 다시 등록해주세요."
                "RATE_LIMITED" in result.webPushFailureCodes -> "알림 제공처가 요청을 제한했습니다. 잠시 후 다시 확인해주세요."
                else -> "알림 제공처 연결과 서버의 푸시 설정을 확인해주세요."
            }
            throw ApiException("OPERATOR_PUSH_FAILED", "테스트 알림을 발송하지 못했습니다. $guidance", HttpStatus.SERVICE_UNAVAILABLE,
                mapOf("webPushFailureCodes" to result.webPushFailureCodes.sorted()))
        }
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
            val result = try {
                fcmSender.sendMulticast(tokens = tokens, title = title, body = body)
            } catch (error: Exception) {
                log.warn("push_failure channel=APP code=SEND_EXCEPTION exception_type={}", error.javaClass.simpleName)
                FcmSendResult(0, emptyList())
            }
            if (result.invalidTokens.isNotEmpty()) {
                settings.fcmTokensRaw = (tokens - result.invalidTokens.toSet()).toCommaSeparated()
            }
            result
        }

        val subscriptions = settings.webPushSubscriptions()
        val webPushResult = if (subscriptions.isEmpty()) {
            null
        } else {
            val result = try {
                webPushSender.sendToAll(subscriptions, title = title, body = body)
            } catch (error: Exception) {
                log.warn("push_failure channel=WEB code=SEND_EXCEPTION exception_type={}", error.javaClass.simpleName)
                WebPushSendResult(0, emptyList(), setOf("SEND_EXCEPTION"))
            }
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
            webPushFailureCodes = webPushResult?.failureCodes ?: emptySet(),
        )
    }

    companion object {
        private const val NOTIFICATION_BODY_MAX_LENGTH = 200
    }
}
