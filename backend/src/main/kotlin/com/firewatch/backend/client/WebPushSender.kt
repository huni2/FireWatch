package com.firewatch.backend.client

import com.firewatch.backend.entity.WebPushSubscription
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.Subscription
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

    override fun sendToAll(subscriptions: List<WebPushSubscription>, title: String, body: String): WebPushSendResult {
        if (subscriptions.isEmpty()) return WebPushSendResult(successCount = 0, invalidEndpoints = emptyList())

        val payload = payloadMapper.writeValueAsString(mapOf("title" to title, "body" to body))
        var successCount = 0
        val invalidEndpoints = mutableListOf<String>()

        for (subscription in subscriptions) {
            try {
                val sub = Subscription(
                    subscription.endpoint,
                    Subscription.Keys(subscription.keys.p256dh, subscription.keys.auth),
                )
                val statusCode = vapidPushService.send(Notification(sub, payload)).statusLine.statusCode
                when {
                    statusCode in 200..299 -> successCount++
                    statusCode == 404 || statusCode == 410 -> invalidEndpoints.add(subscription.endpoint)
                    else -> log.warn("웹 푸시 발송 실패(HTTP $statusCode): ${subscription.endpoint}")
                }
            } catch (e: Exception) {
                log.warn("웹 푸시 발송 중 예외: ${subscription.endpoint}", e)
            }
        }
        return WebPushSendResult(successCount = successCount, invalidEndpoints = invalidEndpoints)
    }
}
