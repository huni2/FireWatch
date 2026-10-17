package com.firewatch.backend.web

import com.firewatch.backend.repository.*
import com.firewatch.backend.web.dto.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import java.math.BigDecimal
import java.time.Duration
import kotlin.test.*

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:holding-notes;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.market.collection-cron=-"])
class HoldingNotesIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @LocalServerPort var port: Int = 0
    @Autowired lateinit var portfolios: PortfolioRepository
    @Autowired lateinit var audit: AuditLogRepository
    private val client get() = WebTestClient.bindToServer().baseUrl("http://127.0.0.1:$port").responseTimeout(Duration.ofSeconds(20)).build()
    private fun draft(version: Long, holdings: Boolean = true) = PortfolioUpdateRequest(version, "메모 검사", 60, "BALANCED", "GENERAL", BigDecimal.ZERO, BigDecimal("100"), if (holdings) listOf(PortfolioHoldingInput("005930.KS", "삼성전자", BigDecimal("2.5"))) else emptyList())
    private fun create(device: String): PortfolioResponse = client.put().uri("/api/portfolio").header("X-Device-Id", device).bodyValue(draft(0)).exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
    private fun save(device: String, note: HoldingNoteRequest) = client.put().uri("/api/portfolio/note").header("X-Device-Id", device).bodyValue(note).exchange()

    @Test fun `메모는 수량과 점검 기준을 바꾸지 않고 이전 앱 저장과 보유 삭제 뒤에도 보존된다`() {
        val device = "holding-notes-preserve"
        val created = create(device)
        val checkpoint = client.put().uri("/api/portfolio/review").header("X-Device-Id", device).bodyValue(PortfolioReviewRequest(created.version)).exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        val saved = save(device, HoldingNoteRequest(checkpoint.version, "005930.ks", "  장기 보유 이유  ", "다음 자료 확인", "2026-10-17")).expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        assertEquals(checkpoint.version + 1, saved.version)
        assertEquals(checkpoint.updatedAt, saved.updatedAt)
        assertEquals(checkpoint.reviewCheckpoint, saved.reviewCheckpoint)
        assertEquals(created.holdings, saved.holdings)
        assertEquals("장기 보유 이유", saved.holdingNotes.single().reason)
        val legacySave = client.put().uri("/api/portfolio").header("X-Device-Id", device).bodyValue(draft(saved.version)).exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        assertEquals(saved.holdingNotes, legacySave.holdingNotes)
        val removed = client.put().uri("/api/portfolio").header("X-Device-Id", device).bodyValue(draft(legacySave.version, false)).exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        assertTrue(removed.holdings.isEmpty())
        assertEquals(saved.holdingNotes, removed.holdingNotes)
        val reflected = save(device, HoldingNoteRequest(removed.version, "005930.KS", "장기 보유 이유", reflection = "처음 생각을 돌아봄")).expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        assertEquals("처음 생각을 돌아봄", reflected.holdingNotes.single().reflection)
        val reload = client.get().uri("/api/portfolio").header("X-Device-Id", device).exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        assertEquals(reflected.holdingNotes, reload.holdingNotes)
        save(device, HoldingNoteRequest(reload.version, "005930.KS")).expectStatus().isOk.expectBody().jsonPath("$.holdingNotes").isEmpty
    }

    @Test fun `충돌과 신원 및 유효성 검증은 다른 사용자 메모를 덮어쓰거나 노출하지 않는다`() {
        val device = "holding-notes-isolation"
        create(device)
        save(device, HoldingNoteRequest(0, "005930.KS", "개인 메모 비밀 문장")).expectStatus().isOk.expectBody(Void::class.java)
        save(device, HoldingNoteRequest(0, "005930.KS", "오래된 수정")).expectStatus().isEqualTo(409).expectBody(Void::class.java)
        client.get().uri("/api/portfolio").header("X-Device-Id", "holding-notes-other").exchange().expectStatus().isOk.expectBody().jsonPath("$.holdingNotes").isEmpty
        client.put().uri("/api/portfolio/note").bodyValue(HoldingNoteRequest(0, "005930.KS", "실패")).exchange().expectStatus().isBadRequest.expectBody(Void::class.java)
        for (bad in listOf(HoldingNoteRequest(-1, "005930.KS"), HoldingNoteRequest(1, "AAPL", "미등록 종목"), HoldingNoteRequest(1, "005930.KS", "가".repeat(501)), HoldingNoteRequest(1, "005930.KS", reviewDate = "2026-02-30"), HoldingNoteRequest(1, "005930.KS", reflection = "가".repeat(1001)))) {
            save(device, bad).expectStatus().isBadRequest.expectBody(Void::class.java)
        }
        val loaded = client.get().uri("/api/portfolio").header("X-Device-Id", device).exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        assertEquals(1L, loaded.version)
        assertEquals("개인 메모 비밀 문장", loaded.holdingNotes.single().reason)
        audit.findAll().filter { it.actionName == "PortfolioService.saveNote" }.forEach {
            assertFalse(it.requestPayload.orEmpty().contains("개인 메모 비밀 문장"))
            assertFalse(it.responseSummary.orEmpty().contains("개인 메모 비밀 문장"))
        }
    }
}
