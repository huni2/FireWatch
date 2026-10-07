package com.firewatch.backend.web

import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.repository.AuditLogRepository
import com.firewatch.backend.repository.AuditLogSpecifications
import com.firewatch.backend.web.dto.AuditLogPageResponse
import com.firewatch.backend.web.dto.toResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

// Design Ref: §4.1 — GET /api/audit-logs?eventType=&status=&from=&to=&page=
@RestController
@RequestMapping("/api/audit-logs")
class AuditLogController(
    private val auditLogRepository: AuditLogRepository,
    private val operatorAccess: com.firewatch.backend.service.OperatorAccess,
) {
    @GetMapping
    suspend fun search(
        @org.springframework.web.bind.annotation.RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @org.springframework.web.bind.annotation.RequestHeader("Authorization", required = false) authorization: String?,
        @org.springframework.web.bind.annotation.RequestHeader("X-API-Key", required = false) apiKey: String?,
        @RequestParam(required = false) eventType: AuditEventType?,
        @RequestParam(required = false) status: AuditStatus?,
        @RequestParam(required = false) from: Instant?,
        @RequestParam(required = false) to: Instant?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): AuditLogPageResponse = withContext(Dispatchers.IO) {
        operatorAccess.requireOperator(deviceId, authorization, apiKey)
        val spec = AuditLogSpecifications.search(eventType, status, from, to)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        auditLogRepository.findAll(spec, pageable).toResponse()
    }
}
