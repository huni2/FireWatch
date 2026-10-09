package com.firewatch.backend.client

import com.firewatch.backend.entity.WebPushSubscription
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.Subscription
import nl.martijndwars.webpush.Encoding
import nl.martijndwars.webpush.Utils
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper
import java.security.Security
import nl.martijndwars.webpush.PushService as VapidPushService

data class WebPushSendResult(
    val successCount: Int,
    val invalidEndpoints: List<String>,
    val failureCodes: Set<String> = emptySet(),
)

/**
 * FcmSender와 별도 인터페이스인 이유: Web Push는 FCM처럼 토큰 목록을 한 번에 보내는 멀티캐스트 API가
 * 없다 — 구독자마다 공개키가 달라 페이로드를 각각 암호화해야 한다(RFC 8291). 무효 판정도 FCM의
 * UNREGISTERED 코드 대신 HTTP 404/410(Gone)으로 온다.
 */
interface WebPushSender {
    fun sendToAll(subscriptions: List<WebPushSubscription>, title: String, body: String): WebPushSendResult
}

@Component
class BrowserWebPushSender(
    @Value("\${firewatch.web-push.public-key:}") private val publicKey: String,
    @Value("\${firewatch.web-push.private-key:}") private val privateKey: String,
    @Value("\${firewatch.web-push.subject:}") private val subject: String,
) : WebPushSender {
    private val log = LoggerFactory.getLogger(BrowserWebPushSender::class.java)
    private val payloadMapper = JsonMapper.builder().build()

    init {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    // 서비스 계정 JSON 없이도 앱 부팅은 막지 않는 FirebaseFcmSender와 동일한 지연 초기화 패턴.
    private val vapidPushService by lazy {
        check(publicKey.isNotBlank() && privateKey.isNotBlank()) {
            "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY가 설정되지 않았습니다"
        }
        VapidPushService(publicKey, privateKey, subject)
    }

    // 설정 값은 출력하지 않고 실제 공개키로 서명을 검증해 같은 쌍인지 확인한다.
    private val keyFailure by lazy {
        try {
            if (Utils.verifyKeyPair(vapidPushService.privateKey, vapidPushService.publicKey)) null else "KEY_PAIR_MISMATCH"
        } catch (_: Exception) {
            "KEY_FORMAT_INVALID"
        }
    }

    override fun sendToAll(subscriptions: List<WebPushSubscription>, title: String, body: String): WebPushSendResult {
        if (subscriptions.isEmpty()) return WebPushSendResult(successCount = 0, invalidEndpoints = emptyList())
        if (publicKey.isBlank() || privateKey.isBlank() || subject.isBlank()) {
            log.warn("web_push_failure code=CONFIG_MISSING")
            return WebPushSendResult(0, emptyList(), setOf("CONFIG_MISSING"))
        }
        keyFailure?.let { code ->
            log.warn("web_push_failure code={}", code)
            return WebPushSendResult(0, emptyList(), setOf(code))
        }

        val payload = payloadMapper.writeValueAsString(mapOf("title" to title, "body" to body))
        var successCount = 0
        val invalidEndpoints = mutableListOf<String>()
        val failureCodes = mutableSetOf<String>()

        for (subscription in subscriptions) {
            try {
                val sub = Subscription(
                    subscription.endpoint,
                    Subscription.Keys(subscription.keys.p256dh, subscription.keys.auth),
                )
                // 기본 send()는 구형 aesgcm/WebPush 헤더를 사용하므로 표준 VAPID 형식을 명시한다.
                val statusCode = vapidPushService.send(Notification(sub, payload), Encoding.AES128GCM).statusLine.statusCode
                when {
                    statusCode in 200..299 -> successCount++
                    else -> {
                        val code = when (statusCode) {
                            404, 410 -> "SUBSCRIPTION_EXPIRED"
                            401, 403 -> "AUTH_REJECTED"
                            429 -> "RATE_LIMITED"
                            else -> "PROVIDER_REJECTED"
                        }
                        if (statusCode == 404 || statusCode == 410) invalidEndpoints.add(subscription.endpoint)
                        failureCodes.add(code)
                        log.warn("web_push_failure code={} http_status={}", code, statusCode)
                    }
                }
            } catch (e: Exception) {
                failureCodes.add("SEND_EXCEPTION")
                log.warn("web_push_failure code=SEND_EXCEPTION exception_type={}", e.javaClass.simpleName)
            }
        }
        return WebPushSendResult(successCount, invalidEndpoints, failureCodes)
    }
}
