package com.firewatch.backend.audit

import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.repository.AuditLogRepository
import com.firewatch.backend.repository.AppUserRepository
import com.firewatch.backend.repository.DeviceLinkRepository
import com.firewatch.backend.repository.AuthSessions
import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.service.OperatorAccess
import com.firewatch.backend.web.UnauthorizedException
import java.util.UUID
import com.firewatch.backend.service.TestFixtureService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.TestPropertySource
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFailsWith

// Design Ref: docs/02-design/features/firewatch.design.md §8.3 — 감사로그 AOP 단위테스트
// 전용 인메모리 DB(테스트 클래스별로 이름을 분리) — 로컬 개발용 파일 DB(./data/firewatch)를
// 테스트가 오염시키지 않도록 격리. 자세한 사유는 [[llm-wiki/log]] 2026-08-19.
@SpringBootTest
@TestPropertySource(
    properties = [
        "firewatch.audit.warning-threshold-ms=50",
        "spring.datasource.url=jdbc:h2:mem:audit-aspect-test;DB_CLOSE_DELAY=-1",
        "firewatch.operator.email=audit-operator@example.test",
    ],
)
class AuditLogAspectTest @Autowired constructor(
    private val fixture: TestFixtureService,
    private val auditLogRepository: AuditLogRepository,
    private val operatorAccess: OperatorAccess,
    private val users: AppUserRepository,
    private val links: DeviceLinkRepository,
    private val sessions: AuthSessions,
) {

    private fun lastLog() = auditLogRepository.findAll().maxByOrNull { it.id ?: 0L }
        ?: error("audit_logs가 비어 있음")

    private fun lastLogFor(actionName: String) = auditLogRepository.findAll()
        .filter { it.actionName == actionName }
        .maxByOrNull { it.id ?: 0L }
        ?: error("$actionName 에 대한 audit_logs가 없음")

    @Test
    fun `성공한 호출은 SUCCESS로 기록되고 반환값이 response_summary에 남는다`() {
        fixture.succeed()
        val last = lastLog()
        assertEquals(AuditStatus.SUCCESS, last.status)
        assertEquals("TestFixtureService.succeed", last.actionName)
        assertEquals("ok", last.responseSummary)
        assertTrue((last.executionTimeMs ?: -1) >= 0)
    }

    @Test
    fun `예외를 던지면 FAILURE로 기록되고 예외는 그대로 전파된다`() {
        assertFailsWith<IllegalStateException> { fixture.fail() }
        val last = lastLog()
        assertEquals(AuditStatus.FAILURE, last.status)
        assertTrue(last.responseSummary?.contains("boom") == true)
    }

    @Test
    fun `임계값(테스트 50ms)을 넘겨 오래 걸리면 WARNING으로 기록된다`() {
        fixture.slow() // 100ms sleep > 50ms 임계값
        val last = lastLog()
        assertEquals(AuditStatus.WARNING, last.status)
    }

    @Test
    fun `AuditContext markFallback을 호출하면 예외 없이도 FALLBACK으로 기록된다`() {
        fixture.fallback()
        val last = lastLog()
        assertEquals(AuditStatus.FALLBACK, last.status)
        assertEquals("test-fallback-reason", last.responseSummary)
    }

    @Test
    fun `markFallback 이후 중첩된 감사 대상 호출이 있어도 FALLBACK은 가장 바깥쪽 호출에만 남는다`() {
        fixture.fallbackThenCallNested()

        val outer = lastLogFor("TestFixtureService.fallbackThenCallNested")
        assertEquals(AuditStatus.FALLBACK, outer.status)
        assertEquals("test-fallback-reason", outer.responseSummary)

        val nested = lastLogFor("TestFixtureNestedService.doSomething")
        assertEquals(AuditStatus.SUCCESS, nested.status)
        assertEquals("nested-ok", nested.responseSummary)
    }

    @Test
    fun `apiKey처럼 비밀값으로 보이는 파라미터는 감사로그에 마스킹돼 남는다`() {
        fixture.callWithSecret(apiKey = "super-secret-value", deviceId = "device-abc")
        val last = lastLogFor("TestFixtureService.callWithSecret")
        assertTrue(last.requestPayload?.contains("super-secret-value") == false)
        assertTrue(last.requestPayload?.contains("[REDACTED]") == true)
        assertTrue(last.requestPayload?.contains("device-abc") == false)
    }

    @Test
    fun `실제 운영자 인증 성공 감사에도 Bearer 헤더를 저장하지 않는다`() {
        val device = UUID.randomUUID().toString()
        val user = users.save(AppUser(googleSub = device, email = "audit-operator@example.test", emailVerified = true))
        links.save(DeviceLink(device, user.id!!))
        val authorization = "Bearer ${sessions.issue(device).token}"

        operatorAccess.requireOperator(device, authorization, null)

        val saved = lastLogFor("OperatorAccess.requireOperator")
        assertTrue(saved.status in setOf(AuditStatus.SUCCESS, AuditStatus.WARNING))
        assertEquals("[[REDACTED], [REDACTED], [REDACTED]]", saved.requestPayload)
        assertTrue(saved.responseSummary?.contains(authorization) == false)
    }

    @Test
    fun `실제 운영자 인증 실패 감사에도 Bearer 헤더를 저장하지 않는다`() {
        assertFailsWith<UnauthorizedException> {
            operatorAccess.requireOperator("audit-unlinked-device", "Bearer audit-private-invalid-token", null)
        }

        val saved = lastLogFor("OperatorAccess.requireOperator")
        assertEquals(AuditStatus.FAILURE, saved.status)
        assertEquals("[[REDACTED], [REDACTED], [REDACTED]]", saved.requestPayload)
        assertTrue(saved.responseSummary?.contains("audit-private-invalid-token") == false)
    }
}
