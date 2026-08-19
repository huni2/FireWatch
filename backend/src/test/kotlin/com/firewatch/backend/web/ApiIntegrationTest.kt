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

    private val webTestClient: WebTestClient by lazy {
        WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
    }

    @BeforeEach
    fun cleanUp() {
        briefingRepository.deleteAll()
        auditLogRepository.deleteAll()
    }

    @Test
    fun `오늘자 브리핑이 없으면 latest는 404를 반환한다`() {
        webTestClient.get().uri("/api/briefings/latest")
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("NOT_FOUND")
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
    fun `설정 변경은 X-API-Key 없으면 401을 반환한다`() {
        webTestClient.put().uri("/api/settings")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "07:30", "interestKeywords" to listOf("AI")))
            .exchange()
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("UNAUTHORIZED")
    }

    @Test
    fun `설정 변경은 올바른 X-API-Key로 성공한다`() {
        webTestClient.put().uri("/api/settings")
            .header("X-API-Key", "test-key")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "07:30", "interestKeywords" to listOf("AI", "반도체")))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pushTime").isEqualTo("07:30")
            .jsonPath("$.interestKeywords.length()").isEqualTo(2)
    }

    @Test
    fun `설정 변경은 pushTime 형식이 틀리면 400과 fieldErrors를 반환한다`() {
        webTestClient.put().uri("/api/settings")
            .header("X-API-Key", "test-key")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(mapOf("pushTime" to "25:99", "interestKeywords" to emptyList<String>()))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error.code").isEqualTo("VALIDATION_ERROR")
            .jsonPath("$.error.details.fieldErrors.pushTime").exists()
    }
}
