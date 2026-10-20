// 기존 환경변수와 새 모델 설정의 실제 Gemini HTTP 요청 경로를 검증한다.
package com.firewatch.backend.client

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.assertEquals

class GeminiModelRoutingTest {
    @Test
    fun `기존 3_5 환경변수는 3_6을 호출하고 명시적인 다른 모델 설정은 유지한다`() {
        val path = AtomicReference<String>()
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            path.set(exchange.requestURI.path)
            exchange.requestBody.use { it.readBytes() }
            val body = """{"candidates":[{"content":{"parts":[{"text":"정상 요약"}]}}]}""".toByteArray(Charsets.UTF_8)
            exchange.responseHeaders.add("Content-Type", "application/json; charset=utf-8")
            exchange.sendResponseHeaders(200, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
        }
        server.start()
        try {
            listOf("gemini-3.5-flash" to "gemini-3.6-flash", "gemini-3.6-flash" to "gemini-3.6-flash", "configured-model" to "configured-model").forEach { (configured, expected) ->
                val client = GeminiClient("http://127.0.0.1:${server.address.port}/v1beta", "local-test-key", configured)
                val result = client.fetchMarketBriefing(null, null, null, null, null, null, null, null, null, null, null, null, emptyList())
                assertEquals("/v1beta/models/$expected:generateContent", path.get())
                assertEquals("정상 요약", result.marketSummary)
            }
        } finally {
            server.stop(0)
        }
    }
}
