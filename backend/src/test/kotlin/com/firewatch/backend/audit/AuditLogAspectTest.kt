package com.firewatch.backend.audit

import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.repository.AuditLogRepository
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
    ],
)
class AuditLogAspectTest @Autowired constructor(
    private val fixture: TestFixtureService,
    private val auditLogRepository: AuditLogRepository,
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
}
