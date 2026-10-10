// 백업 작업 보고를 중복 없이 기록하고 실패 알림의 제한 재시도 상태를 보존한다.
package com.firewatch.backend.service

import com.firewatch.backend.web.BackupReportInput
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Instant

@Service
class BackupReportService(private val jdbc: JdbcTemplate) {
    @Transactional
    fun record(input: BackupReportInput, now: Instant) {
        val id = "backup:${input.runId}"
        if (input.failureCode != null) {
            val message = "암호화 DB 백업에 실패했습니다. 실행 로그의 단계 코드를 확인해주세요. (${input.failureCode})"
            // Duplicate reports cannot reset the push retry counter, including concurrent deliveries.
            jdbc.update("""INSERT INTO collection_alerts (id,category,message,created_at,updated_at)
                SELECT ?, 'backup', ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM collection_alerts WHERE id=?)""",
                id, message, Timestamp.from(now), Timestamp.from(now), id)
        } else {
            jdbc.update("UPDATE collection_alerts SET resolved_at=?,updated_at=? WHERE category='backup' AND resolved_at IS NULL",
                Timestamp.from(now), Timestamp.from(now))
        }
        jdbc.update("INSERT INTO audit_logs (event_type,action_name,status,response_summary,created_at) VALUES ('UNCATEGORIZED','backup.report',?,?,?)",
            if (input.failureCode == null) "SUCCESS" else "FAILURE",
            "백업 실행 ${input.runId}: ${input.failureCode ?: "암호화 파일 보관 완료"}", Timestamp.from(now))
    }
    companion object {
        val CODES = setOf("CONFIG_MISSING", "TOOL_FAILED", "DUMP_FAILED", "ARCHIVE_INVALID", "ENCRYPT_FAILED", "SIZE_LIMIT", "UPLOAD_FAILED", "JOB_FAILED")
    }
}
