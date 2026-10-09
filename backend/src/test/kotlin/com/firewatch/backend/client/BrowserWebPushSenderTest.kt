// 웹 푸시 설정 누락을 외부 요청 없이 안전한 실패 코드로 검증한다.
package com.firewatch.backend.client

import com.firewatch.backend.entity.WebPushKeys
import com.firewatch.backend.entity.WebPushSubscription
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Security
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import nl.martijndwars.webpush.Utils
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.jce.interfaces.ECPrivateKey
import org.bouncycastle.jce.interfaces.ECPublicKey
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

class BrowserWebPushSenderTest {
    private fun keyPair(): KeyPair {
        if (Security.getProvider("BC") == null) Security.addProvider(BouncyCastleProvider())
        return KeyPairGenerator.getInstance("EC", "BC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()
    }

    private fun publicKey(pair: KeyPair) = Base64.getUrlEncoder().withoutPadding().encodeToString(Utils.encode(pair.public as ECPublicKey))
    private fun privateKey(pair: KeyPair) = Base64.getUrlEncoder().withoutPadding().encodeToString(Utils.encode(pair.private as ECPrivateKey))

    @Test
    fun `실제 요청은 aes128gcm과 검증 가능한 표준 VAPID 인증을 사용한다`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val authorization = AtomicReference<String>()
        val encoding = AtomicReference<String>()
        val requests = AtomicInteger()
        server.createContext("/push") { exchange ->
            requests.incrementAndGet()
            authorization.set(exchange.requestHeaders.getFirst("Authorization"))
            encoding.set(exchange.requestHeaders.getFirst("Content-Encoding"))
            exchange.requestBody.use { it.readBytes() }
            exchange.sendResponseHeaders(201, -1)
            exchange.close()
        }
        server.start()
        try {
            val pair = keyPair()
            val subscriber = keyPair()
            val subscription = WebPushSubscription("http://127.0.0.1:${server.address.port}/push", WebPushKeys(publicKey(subscriber), Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(16) { it.toByte() })))
            val result = BrowserWebPushSender(publicKey(pair), privateKey(pair), "mailto:test@example.com").sendToAll(listOf(subscription), "테스트", "내용")
            assertEquals(1, result.successCount)
            assertEquals("aes128gcm", encoding.get())
            assertTrue(authorization.get().startsWith("vapid t="))
            val jwt = authorization.get().removePrefix("vapid t=").substringBefore(',')
            val signature = Signature.getInstance("SHA256withECDSAinP1363Format").apply {
                initVerify(KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(pair.public.encoded)))
                update(jwt.substringBeforeLast('.').toByteArray(Charsets.US_ASCII))
            }
            assertTrue(signature.verify(Base64.getUrlDecoder().decode(jwt.substringAfterLast('.'))))
            assertEquals(1, requests.get())

            val mismatched = BrowserWebPushSender(publicKey(pair), privateKey(keyPair()), "mailto:test@example.com").sendToAll(listOf(subscription), "테스트", "내용")
            assertEquals(WebPushSendResult(0, emptyList(), setOf("KEY_PAIR_MISMATCH")), mismatched)
            val malformed = BrowserWebPushSender("invalid", "invalid", "mailto:test@example.com").sendToAll(listOf(subscription), "테스트", "내용")
            assertEquals(WebPushSendResult(0, emptyList(), setOf("KEY_FORMAT_INVALID")), malformed)
            assertEquals(1, requests.get())
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `키 또는 subject 누락 시 외부 발송 없이 설정 실패를 반환한다`() {
        val subscription = WebPushSubscription("https://push.example/private-endpoint", WebPushKeys("private-key", "private-auth"))
        for ((publicKey, privateKey, subject) in listOf(Triple("", "private", "mailto:test@example.com"), Triple("public", "", "mailto:test@example.com"), Triple("public", "private", ""))) {
            val result = BrowserWebPushSender(publicKey, privateKey, subject).sendToAll(listOf(subscription), "테스트", "내용")
            assertEquals(WebPushSendResult(0, emptyList(), setOf("CONFIG_MISSING")), result)
        }
    }
}
