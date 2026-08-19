package com.firewatch.backend.client

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.MessagingErrorCode
import com.google.firebase.messaging.MulticastMessage
import com.google.firebase.messaging.Notification
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets

/**
 * Design Ref: §2.2 — Firebase Admin SDK로 FCM 발송(FR-03 발송부).
 * `sendEachForMulticast`는 100개 토큰까지 지원(Phase 1엔 앱이 없어 토큰이 거의 없으므로 문제 없음).
 * FirebaseApp 초기화는 지연 처리 — 서비스 계정 JSON이 없어도 앱 부팅은 막지 않는다(module-1~3처럼
 * "설정 없으면 그 기능만 실패"하는 일관된 패턴).
 */
@Component
class FirebaseFcmSender(
    @Value("\${firewatch.firebase.service-account-json:}") private val serviceAccountJson: String,
) : FcmSender {

    private val messaging: FirebaseMessaging by lazy {
        check(serviceAccountJson.isNotBlank()) { "FIREBASE_SERVICE_ACCOUNT_JSON이 설정되지 않았습니다" }
        val credentials = GoogleCredentials.fromStream(
            ByteArrayInputStream(serviceAccountJson.toByteArray(StandardCharsets.UTF_8)),
        )
        val app = FirebaseApp.getApps().firstOrNull()
            ?: FirebaseApp.initializeApp(FirebaseOptions.builder().setCredentials(credentials).build())
        FirebaseMessaging.getInstance(app)
    }

    override fun sendMulticast(tokens: List<String>, title: String, body: String): FcmSendResult {
        if (tokens.isEmpty()) return FcmSendResult(successCount = 0, invalidTokens = emptyList())

        val message = MulticastMessage.builder()
            .setNotification(Notification.builder().setTitle(title).setBody(body).build())
            .addAllTokens(tokens)
            .build()

        val response = messaging.sendEachForMulticast(message)
        val invalidTokens = response.responses.mapIndexedNotNull { index, sendResponse ->
            val isUnregistered = sendResponse.exception?.messagingErrorCode == MessagingErrorCode.UNREGISTERED
            if (!sendResponse.isSuccessful && isUnregistered) tokens[index] else null
        }
        return FcmSendResult(successCount = response.successCount, invalidTokens = invalidTokens)
    }
}
