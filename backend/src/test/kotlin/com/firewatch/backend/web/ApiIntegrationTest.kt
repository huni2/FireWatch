package com.firewatch.backend.web

import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.AuditLog
import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.repository.AuditLogRepository
import com.firewatch.backend.repository.BriefingRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.MediaType
import org.springframework.test.web.reactive.server.WebTestClient
import java.time.LocalDate

/**
 * Design Ref: docs/02-design/features/firewatch.design.md §8.2 — L1 API Test Scenarios.
 * 실제 내장 서버(RANDOM_PORT)로 HTTP 요청까지 왕복한다 — WebTestClient는 별도 스레드로 요청을
 * 보내 테스트 메서드의 트랜잭션 롤백에 의존할 수 없으므로, 전용 인메모리 DB + 매 테스트 전 수동
 * 정리로 격리한다(파일 DB인 로컬 개발 DB와 별개).
 *
 * Boot 4에서 `WebTestClient` 빈이 자동 등록되지 않아(webflux-test 스타터만으로는 부족,
 * module-1/2의 WebClient.Builder 미등록과 같은 계열의 이슈) `@LocalServerPort`로 직접 만든다.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = [
        "spring.datasource.url=jdbc:h2:mem:api-integration-test;DB_CLOSE_DELAY=-1",
        "firewatch.settings.api-key=test-key",
    ],
)
class ApiIntegrationTest @Autowired constructor(
    private val briefingRepository: BriefingRepository,
    private val auditLogRepository: AuditLogRepository,
) {
    @LocalServerPort
    private var port: Int = 0
    @Autowired private lateinit var settings: com.firewatch.backend.repository.UserSettingsRepository
    @Autowired private lateinit var jdbc: org.springframework.jdbc.core.JdbcTemplate

    @Test
    fun `DB 연결 풀 상태는 관리 키가 있어야 조회하며 연결 정보는 공개하지 않는다`() {
        webTestClient.get().uri("/api/operations/database-pool").exchange().expectStatus().isUnauthorized
        webTestClient.get().uri("/api/operations/database-pool").header("X-API-Key", "wrong-key")
            .exchange().expectStatus().isUnauthorized
        webTestClient.get().uri("/api/operations/database-pool").header("X-API-Key", "test-key")
            .exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.maximumConnections").isNumber
            .jsonPath("$.activeConnections").isNumber
            .jsonPath("$.waitingRequests").isNumber
            .jsonPath("$.password").doesNotExist()
            .jsonPath("$.jdbcUrl").doesNotExist()
    }

    @Test
    fun `운영자 장애 푸시 수신자 등록은 관리 키와 기존 푸시 구독이 필요하다`() {
        webTestClient.post().uri("/api/collection/operator").header("X-Device-Id", "operator-api-test").exchange().expectStatus().isUnauthorized
        webTestClient.post().uri("/api/collection/operator").header("X-API-Key", "test-key").header("X-Device-Id", "operator-api-test").exchange().expectStatus().isEqualTo(409)
        val operator = settings.findByDeviceId("operator-api-test")!!
        operator.fcmTokensRaw = "operator-token"
        settings.save(operator)
        webTestClient.post().uri("/api/collection/operator").header("X-API-Key", "test-key").header("X-Device-Id", "operator-api-test").exchange().expectStatus().isOk.expectBody().jsonPath("$.registered").isEqualTo(true)
        kotlin.test.assertEquals(operator.id, jdbc.queryForObject("SELECT settings_id FROM collection_operator WHERE id=1", Long::class.java))
        jdbc.update("DELETE FROM collection_operator")
    }

    private val webTestClient: WebTestClient by lazy {
        WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
    }

    @BeforeEach
    fun cleanUp() {
        briefingRepository.deleteAll()
        auditLogRepository.deleteAll()
    }

    @Test
    fun `저장된 브리핑이 없으면 latest는 404를 반환한다`() {
        webTestClient.get().uri("/api/briefings/latest")
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("NOT_FOUND")
    }

    @Test
    fun `개별 추천 근거를 날짜별 저장 조회하며 과거 추천 원본은 삭제하거나 이유를 보충하지 않는다`() {
        val today = LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
        val old = briefingRepository.save(Briefing(briefingDate = today.minusDays(1), marketSummary = "과거 요약", recommendedStocksRaw = "삼성전자", dataSourceStatus = DataSourceStatus.NORMAL))
        briefingRepository.save(Briefing(briefingDate = today, marketSummary = "현재 요약", recommendedStocksRaw = "삼성전자", dataSourceStatus = DataSourceStatus.NORMAL,
            recommendationDetailsRaw = """[{"stockName":"삼성전자","reason":"제공된 반도체 기사 해석","risk":"실적 반영 확인","sourceNewsLinks":["https://example.com/news"]},{"stockName":"없는 종목","reason":"연결 안 됨","risk":"위험","sourceNewsLinks":[]}]"""))
        webTestClient.get().uri("/api/briefings/latest").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$.recommendationDetails.length()").isEqualTo(1)
            .jsonPath("$.recommendationDetails[0].reason").isEqualTo("제공된 반도체 기사 해석")
        val persisted = briefingRepository.findById(old.id!!).get()
        kotlin.test.assertEquals("삼성전자", persisted.recommendedStocksRaw)
        kotlin.test.assertNull(persisted.recommendationDetailsRaw)
        kotlin.test.assertEquals(2, briefingRepository.count())
    }

    @Test
    fun `오늘 자료가 없어도 마지막 저장 자료와 지수를 유지하며 미래 자료는 제외한다`() {
        val today = LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
        briefingRepository.save(Briefing(briefingDate = today.minusDays(1), marketSummary = "저장된 요약", goldPrice = java.math.BigDecimal("2500"), recommendedStocksRaw = "삼성전자", dataSourceStatus = DataSourceStatus.NORMAL))
        briefingRepository.save(Briefing(briefingDate = today.plusDays(1), marketSummary = "미래 자료", dataSourceStatus = DataSourceStatus.NORMAL))
        repeat(2) {
            webTestClient.get().uri("/api/briefings/latest").exchange().expectStatus().isOk.expectBody()
                .jsonPath("$.briefingDate").isEqualTo(today.minusDays(1).toString())
                .jsonPath("$.goldPrice").isEqualTo(2500)
                .jsonPath("$.recommendedStocks[0]").isEqualTo("삼성전자")
        }
        kotlin.test.assertEquals(2, briefingRepository.count())
    }

    @Test
    fun `없는 API는 데이터 오류인 500이 아니라 404를 반환한다`() {
        webTestClient.get().uri("/api/missing-endpoint").exchange().expectStatus().isNotFound
            .expectBody().jsonPath("$.error.code").isEqualTo("NOT_FOUND")
    }

    @Test
    fun `오늘자 브리핑이 있으면 latest가 200으로 반환한다`() {
        briefingRepository.save(
            Briefing(
                briefingDate = LocalDate.now(),
                marketSummary = "코스피 강세",
                recommendedStocksRaw = "삼성전자,SK하이닉스",
                dataSourceStatus = DataSourceStatus.NORMAL,
            ),
        )

        webTestClient.get().uri("/api/briefings/latest")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.marketSummary").isEqualTo("코스피 강세")
            .jsonPath("$.recommendedStocks[0]").isEqualTo("삼성전자")
            .jsonPath("$.dataSourceStatus").isEqualTo("NORMAL")
    }

    @Test
    fun `감사로그를 status로 필터링하면 해당 상태만 반환한다`() {
        auditLogRepository.save(
            AuditLog(eventType = AuditEventType.SCHEDULER, actionName = "a", status = AuditStatus.SUCCESS),
        )
        auditLogRepository.save(
            AuditLog(eventType = AuditEventType.GEMINI_API, actionName = "b", status = AuditStatus.FAILURE),
        )

        webTestClient.get().uri("/api/audit-logs?status=FAILURE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.data.length()").isEqualTo(1)
            .jsonPath("$.data[0].status").isEqualTo("FAILURE")
            .jsonPath("$.pagination.total").isEqualTo(1)
    }

    @Test
    fun `설정 조회 갱신 모두 X-Device-Id 없으면 400을 반환한다`() {
        webTestClient.get().uri("/api/settings")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("VALIDATION_ERROR")

        webTestClient.put().uri("/api/settings")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "07:30", "interestKeywords" to listOf("AI")))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("VALIDATION_ERROR")
    }

    @Test
    fun `설정 변경은 X-Device-Id만으로 성공하고, 그 기기로 다시 조회하면 갱신된 값이 보인다`() {
        webTestClient.put().uri("/api/settings")
            .header("X-Device-Id", "device-1")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "07:30", "interestKeywords" to listOf("AI", "반도체")))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pushTime").isEqualTo("07:30")
            .jsonPath("$.interestKeywords.length()").isEqualTo(2)

        webTestClient.get().uri("/api/settings")
            .header("X-Device-Id", "device-1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pushTime").isEqualTo("07:30")
    }

    @Test
    fun `기기가 다르면 서로 다른 설정을 갖는다`() {
        webTestClient.put().uri("/api/settings")
            .header("X-Device-Id", "device-a")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "06:00", "interestKeywords" to emptyList<String>()))
            .exchange()
            .expectStatus().isOk

        webTestClient.get().uri("/api/settings")
            .header("X-Device-Id", "device-b")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pushTime").isEqualTo("08:00") // device-b는 아직 만들어진 적 없어 기본값
    }

    @Test
    fun `설정 변경은 pushTime 형식이 틀리면 400과 fieldErrors를 반환한다`() {
        webTestClient.put().uri("/api/settings")
            .header("X-Device-Id", "device-1")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "25:99", "interestKeywords" to emptyList<String>()))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("VALIDATION_ERROR")
            .jsonPath("$.error.details.fieldErrors.pushTime").exists()
    }
}
