package com.firewatch.backend.client

data class FcmSendResult(
    val successCount: Int,
    val invalidTokens: List<String>,
)

/**
 * Firebase SDK 정적 API(FirebaseMessaging.getInstance())를 직접 쓰면 단위테스트가 어려워
 * 인터페이스로 감쌌다 — [PushService] 테스트는 이 인터페이스를 MockK로 대체한다.
 */
interface FcmSender {
    fun sendMulticast(tokens: List<String>, title: String, body: String): FcmSendResult
}
