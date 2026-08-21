package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditContext
import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service

/**
 * [com.firewatch.backend.audit.AuditLogAspect] 테스트 전용 픽스처.
 * `service` 패키지에 있어야 AOP 포인트컷 대상이 된다. 프로덕션 JAR에는 포함되지 않는다(test source set).
 */
@Service
class TestFixtureService(
    private val nested: TestFixtureNestedService,
) : AuditedComponent {
    override val auditEventType = AuditEventType.SCHEDULER

    fun succeed(): String = "ok"

    fun fail(): String {
        throw IllegalStateException("boom")
    }

    fun slow(): String {
        Thread.sleep(100)
        return "slow-ok"
    }

    fun fallback(): String {
        AuditContext.markFallback("test-fallback-reason")
        return "fallback-ok"
    }

    /** SchedulerJob이 Gemini 실패 후 markFallback을 부르고 나서 NewsService 등 다른 감사 대상 빈을
     * 호출하는 상황을 재현한다 — 그 중첩 호출이 FALLBACK을 가로채가면 안 된다. */
    fun fallbackThenCallNested(): String {
        AuditContext.markFallback("test-fallback-reason")
        nested.doSomething()
        return "outer-ok"
    }
}
