package com.firewatch.backend.repository

import com.firewatch.backend.entity.AuditLog
import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.entity.AuditEventType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant

interface AuditLogRepository : JpaRepository<AuditLog, Long> {

    // Design Ref: §4.2 GET /api/audit-logs — eventType/status/from/to 전부 선택 필터
    @Query(
        """
        select a from AuditLog a
        where (:eventType is null or a.eventType = :eventType)
          and (:status is null or a.status = :status)
          and (:from is null or a.createdAt >= :from)
          and (:to is null or a.createdAt <= :to)
        order by a.createdAt desc
        """,
    )
    fun search(
        @Param("eventType") eventType: AuditEventType?,
        @Param("status") status: AuditStatus?,
        @Param("from") from: Instant?,
        @Param("to") to: Instant?,
        pageable: Pageable,
    ): Page<AuditLog>
}
