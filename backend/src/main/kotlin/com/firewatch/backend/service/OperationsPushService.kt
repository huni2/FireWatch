package com.firewatch.backend.service

import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.webPushSubscriptions
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.sql.Timestamp
import java.time.Instant

/** Durable outbox: only the designated operator receives collection failure pushes. */
@Service
class OperationsPushService(private val jdbc: JdbcTemplate, private val settings: UserSettingsRepository, private val push: PushService) {
    fun flush(now: Instant) {
        val ownerId = jdbc.query("SELECT settings_id FROM collection_operator WHERE id=1", { row, _ -> row.getLong(1) }).firstOrNull() ?: return
        val operator = settings.findById(ownerId).orElse(null) ?: return
        if (operator.fcmTokens().isEmpty() && operator.webPushSubscriptions().isEmpty()) return
        val pending = jdbc.query("""SELECT id, category, message FROM collection_alerts WHERE notified_at IS NULL AND resolved_at IS NULL
            AND push_attempts<3 AND (notify_after IS NULL OR notify_after<=?) ORDER BY created_at LIMIT 4""",
            { row, _ -> Triple(row.getString("id"), row.getString("category"), row.getString("message")) }, Timestamp.from(now))
        pending.forEach { (id, category, message) ->
            // Claim before sending; restarts cannot reset attempts or make a tight retry loop.
            if (jdbc.update("""UPDATE collection_alerts SET push_attempts=push_attempts+1, notify_after=? WHERE id=? AND notified_at IS NULL
                AND resolved_at IS NULL AND push_attempts<3 AND (notify_after IS NULL OR notify_after<=?)""", Timestamp.from(now.plusSeconds(3600)), id, Timestamp.from(now)) != 1) return@forEach
            val sent = runCatching { push.notifyOperator(operator, "$category · $message · ${now.atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDateTime()} KST") }.getOrNull()
            if (sent != null && sent.successCount + sent.webPushSuccessCount > 0) {
                jdbc.update("UPDATE collection_alerts SET notified_at=? WHERE id=?", Timestamp.from(now), id)
            } else {
                jdbc.update("INSERT INTO audit_logs (event_type, action_name, status, response_summary, created_at) VALUES ('FCM_PUSH', 'collection.operatorPush', 'FAILURE', ?, ?)",
                    "운영자 장애 푸시 발송 실패. 최대 3회, 60분 간격으로 제한합니다.", Timestamp.from(now))
            }
        }
    }
}
