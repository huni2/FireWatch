// 웹 푸시 설정 누락을 외부 요청 없이 안전한 실패 코드로 검증한다.
package com.firewatch.backend.client

import com.firewatch.backend.entity.WebPushKeys
import com.firewatch.backend.entity.WebPushSubscription
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class BrowserWebPushSenderTest {
    @Test
    fun `키 또는 subject 누락 시 외부 발송 없이 설정 실패를 반환한다`() {
        val subscription = WebPushSubscription("https://push.example/private-endpoint", WebPushKeys("private-key", "private-auth"))
        for ((publicKey, privateKey, subject) in listOf(Triple("", "private", "mailto:test@example.com"), Triple("public", "", "mailto:test@example.com"), Triple("public", "private", ""))) {
            val result = BrowserWebPushSender(publicKey, privateKey, subject).sendToAll(listOf(subscription), "테스트", "내용")
            assertEquals(WebPushSendResult(0, emptyList(), setOf("CONFIG_MISSING")), result)
        }
    }
}
