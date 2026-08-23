package com.firewatch.backend.client

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

// Design Ref: docs/02-design/features/mobile-app.design.md §2.2 — 순수 파싱 함수만 검증(네트워크 없음),
// FinancialApiClientTest와 동일 관례.
class ExpoPushSenderTest {

    @Test
    fun `모두 성공하면 successCount만 채워지고 invalidTokens는 비어있다`() {
        val response = mapOf(
            "data" to listOf(
                mapOf("status" to "ok", "id" to "receipt-1"),
                mapOf("status" to "ok", "id" to "receipt-2"),
            ),
        )

        val result = ExpoPushSender.parseResponse(listOf("token-a", "token-b"), response)

        assertEquals(2, result.successCount)
        assertEquals(emptyList(), result.invalidTokens)
    }

    @Test
    fun `DeviceNotRegistered면 해당 토큰을 invalidTokens에 담는다`() {
        val response = mapOf(
            "data" to listOf(
                mapOf("status" to "ok", "id" to "receipt-1"),
                mapOf(
                    "status" to "error",
                    "message" to "not a registered push notification recipient",
                    "details" to mapOf("error" to "DeviceNotRegistered"),
                ),
            ),
        )

        val result = ExpoPushSender.parseResponse(listOf("token-a", "token-b"), response)

        assertEquals(1, result.successCount)
        assertEquals(listOf("token-b"), result.invalidTokens)
    }

    @Test
    fun `DeviceNotRegistered가 아닌 에러는 invalidTokens에 담지 않는다`() {
        val response = mapOf(
            "data" to listOf(
                mapOf(
                    "status" to "error",
                    "message" to "message too large",
                    "details" to mapOf("error" to "MessageTooBig"),
                ),
            ),
        )

        val result = ExpoPushSender.parseResponse(listOf("token-a"), response)

        assertEquals(0, result.successCount)
        assertEquals(emptyList(), result.invalidTokens)
    }
}
