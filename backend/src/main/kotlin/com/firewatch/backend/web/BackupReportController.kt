// 인증된 백업 작업의 성공·실패를 감사 기록과 운영자 알림에 연결한다.
package com.firewatch.backend.web

import com.firewatch.backend.service.BackupReportService
import com.firewatch.backend.service.OperatorAccess
import com.firewatch.backend.service.OperationsPushService
import org.springframework.web.bind.annotation.*
import java.time.Instant
import org.springframework.dao.DuplicateKeyException
import org.springframework.http.HttpStatus

data class BackupReportInput(val runId: String, val failureCode: String? = null)

@RestController
@RequestMapping("/api/operations/backup")
class BackupReportController(private val access: OperatorAccess, private val reports: BackupReportService,
                             private val notifications: OperationsPushService) {
    @PostMapping("/report")
    fun report(@RequestHeader("X-API-Key", required = false) apiKey: String?,
               @RequestBody input: BackupReportInput): Map<String, Boolean> {
        access.requireOperator(null, null, apiKey)
        if (!Regex("[0-9]{1,20}(-[0-9]{1,3})?").matches(input.runId) ||
            (input.failureCode != null && input.failureCode !in BackupReportService.CODES))
            throw ApiException("INVALID_BACKUP_REPORT", "백업 실행 번호와 오류 코드를 확인해주세요.", HttpStatus.BAD_REQUEST)
        try { reports.record(input, Instant.now()) }
        catch (_: DuplicateKeyException) { /* The concurrent winner already persisted this run's failure. */ }
        // The report commits before network delivery; the existing bounded outbox retries failures.
        if (input.failureCode != null) runCatching { notifications.flush(Instant.now()) }
        return mapOf("recorded" to true)
    }
}
