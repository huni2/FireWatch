package com.firewatch.backend.client

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.time.Duration

/**
 * Design Ref: mobile-app.design.md §2.3 — Expo Push Service로 발송(FR-03 발송부).
 * 원래는 Firebase Admin SDK로 원시 FCM 토큰에 직접 보냈지만, iOS(APNs)/Android(FCM) 토큰 형식
 * 차이를 Expo가 대신 흡수해주는 이 방식으로 전환해 두 플랫폼 모두 Expo Go만으로 검증 가능하게
 * 했다(2026-08-23, APP-2 논의 — 서비스 계정 JSON·react-native-firebase 둘 다 불필요해짐).
 * 인증 없이 호출 가능한 Expo 공개 엔드포인트. 요청 형식: https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Component
class ExpoPushSender(
    @Value("\${firewatch.expo.push-url}") pushUrl: String,
) : FcmSender {
    private val client = WebClient.builder().baseUrl(pushUrl).build()

    override fun sendMulticast(tokens: List<String>, title: String, body: String): FcmSendResult {
        if (tokens.isEmpty()) return FcmSendResult(successCount = 0, invalidTokens = emptyList())

        val messages = tokens.map { token -> mapOf("to" to token, "title" to title, "body" to body) }
        val response = client.post()
            .bodyValue(messages)
            .retrieve()
            .bodyToMono<Map<String, Any?>>()
            .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
            .block()
            ?: error("Expo Push API 응답이 비어 있음")

        return parseResponse(tokens, response)
    }

    companion object {
        private const val TIMEOUT_SECONDS = 10L

        // Expo 응답의 data 배열은 요청한 tokens와 같은 순서로 온다(공식 문서 명시).
        fun parseResponse(tokens: List<String>, response: Map<String, Any?>): FcmSendResult {
            @Suppress("UNCHECKED_CAST")
            val results = response["data"] as? List<Map<String, Any?>> ?: emptyList()
            var successCount = 0
            val invalidTokens = mutableListOf<String>()

            results.forEachIndexed { index, result ->
                val token = tokens.getOrNull(index) ?: return@forEachIndexed
                if (result["status"] == "ok") {
                    successCount++
                    return@forEachIndexed
                }
                @Suppress("UNCHECKED_CAST")
                val details = result["details"] as? Map<String, Any?>
                if (details?.get("error") == "DeviceNotRegistered") {
                    invalidTokens.add(token)
                }
            }
            return FcmSendResult(successCount = successCount, invalidTokens = invalidTokens)
        }
    }
}
