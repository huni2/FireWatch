package com.firewatch.backend.repository

import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.AuditLog
import com.firewatch.backend.entity.AuditStatus
import org.springframework.data.jpa.domain.Specification
import java.time.Instant

// Design Ref: §4.1 GET /api/audit-logs — eventType/status/from/to 전부 선택 필터.
// AuditLogRepository의 JPQL "IS NULL OR" 쿼리를 대체 — 필터가 있을 때만 predicate를 추가한다.
object AuditLogSpecifications {
    fun search(
        eventType: AuditEventType?,
        status: AuditStatus?,
        from: Instant?,
        to: Instant?,
    ): Specification<AuditLog> =
        Specification { root, _, builder ->
            val predicates = buildList {
                eventType?.let { add(builder.equal(root.get<AuditEventType>("eventType"), it)) }
                status?.let { add(builder.equal(root.get<AuditStatus>("status"), it)) }
                from?.let { add(builder.greaterThanOrEqualTo(root.get("createdAt"), it)) }
                to?.let { add(builder.lessThanOrEqualTo(root.get("createdAt"), it)) }
            }
            builder.and(*predicates.toTypedArray())
        }
}
