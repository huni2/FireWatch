package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.AuditLog
import com.firewatch.backend.entity.AuditStatus
import org.springframework.data.domain.Page
import java.time.Instant

// Design Ref: §4.2 GET /api/audit-logs 응답 형식
data class AuditLogResponse(
    val id: Long,
    val eventType: AuditEventType,
    val actionName: String,
    val status: AuditStatus,
    val executionTimeMs: Int?,
    val responseSummary: String?,
    val createdAt: Instant,
)

data class PaginationResponse(val page: Int, val size: Int, val total: Long)

data class AuditLogPageResponse(val data: List<AuditLogResponse>, val pagination: PaginationResponse)

fun AuditLog.toResponse() = AuditLogResponse(
    id = id ?: error("저장되지 않은 AuditLog에는 응답 DTO를 만들 수 없음"),
    eventType = eventType,
    actionName = actionName,
    status = status,
    executionTimeMs = executionTimeMs,
    responseSummary = responseSummary,
    createdAt = createdAt,
)

fun Page<AuditLog>.toResponse() = AuditLogPageResponse(
    data = content.map { it.toResponse() },
    pagination = PaginationResponse(page = number, size = size, total = totalElements),
)
