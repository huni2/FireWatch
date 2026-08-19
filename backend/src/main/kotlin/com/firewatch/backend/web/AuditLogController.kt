package com.firewatch.backend.web

import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.repository.AuditLogRepository
import com.firewatch.backend.web.dto.AuditLogPageResponse
import com.firewatch.backend.web.dto.toResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.data.domain.PageRequest
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
) {
    @GetMapping
    suspend fun search(
        @RequestParam(required = false) eventType: AuditEventType?,
        @RequestParam(required = false) status: AuditStatus?,
        @RequestParam(required = false) from: Instant?,
        @RequestParam(required = false) to: Instant?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): AuditLogPageResponse = withContext(Dispatchers.IO) {
        auditLogRepository.search(eventType, status, from, to, PageRequest.of(page, size)).toResponse()
    }
}
