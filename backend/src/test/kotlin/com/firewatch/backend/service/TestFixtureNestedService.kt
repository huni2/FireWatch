package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service

/**
 * [TestFixtureService]가 markFallback() 이후 호출하는 "중첩된" 감사 대상 빈 — AuditLogAspect가
 * 가장 바깥쪽 호출에만 FALLBACK 표시를 붙이는지 검증하는 용도. `service` 패키지에 있어야
 * AOP 포인트컷 대상이 된다. 프로덕션 JAR에는 포함되지 않는다(test source set).
 */
@Service
class TestFixtureNestedService : AuditedComponent {
    override val auditEventType = AuditEventType.SCHEDULER

    fun doSomething(): String = "nested-ok"
}
