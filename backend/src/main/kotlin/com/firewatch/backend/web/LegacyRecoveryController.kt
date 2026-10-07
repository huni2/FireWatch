package com.firewatch.backend.web

import com.firewatch.backend.service.OperatorAccess
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController

/** The old public identifier cannot prove ownership. Only an administrator may recover it. */
@RestController
class LegacyRecoveryController(
    private val jdbc: JdbcTemplate,
    private val operatorAccess: OperatorAccess,
) {
    @PostMapping("/api/settings/recover-legacy")
    @Transactional
    fun recover(@RequestHeader("X-API-Key", required = false) apiKey: String?,
                @RequestHeader("X-Device-Id", required = false) deviceId: String?,
                @RequestHeader("Authorization", required = false) authorization: String?): Map<String, Boolean> {
        operatorAccess.requireOperator(deviceId, authorization, apiKey)
        val target = deviceId.requireDeviceId()
        val source = jdbc.queryForList("SELECT id, user_id FROM user_settings WHERE device_id=? FOR UPDATE", "legacy-owner-device").singleOrNull()
            ?: throw NotFoundException("이전할 기존 운영자 설정이 없습니다. 이미 이전했을 수 있습니다.")
        if (source["user_id"] != null) throw ConflictException("계정에 연결된 설정은 이 경로로 이전할 수 없습니다.")
        if (jdbc.queryForObject("SELECT COUNT(*) FROM device_links WHERE device_id=?", Long::class.java, target) != 0L ||
            jdbc.queryForObject("SELECT COUNT(*) FROM game_sessions WHERE device_id=?", Long::class.java, target) != 0L)
            throw ConflictException("계정 연동이나 게임 기록이 없는 새 브라우저에서 이전해주세요.")
        val existing = jdbc.queryForList("SELECT * FROM user_settings WHERE device_id=? FOR UPDATE", target).singleOrNull()
        if (existing != null) {
            val fields = listOf("interest_keywords", "watched_stocks", "fcm_tokens", "web_push_subscriptions")
            if (existing["user_id"] != null || existing["push_time"] != "08:00" ||
                fields.any { existing[it]?.toString()?.trim()?.let { value -> value.isNotEmpty() && value != "[]" } == true } ||
                jdbc.queryForObject("SELECT COUNT(*) FROM portfolios WHERE owner_id=?", Long::class.java, existing["id"]) != 0L)
                throw ConflictException("현재 브라우저에 저장한 데이터가 있어 이전을 중단했습니다. 새 브라우저에서 진행해주세요.")
            // Preserve even the empty destination row; never remove data during recovery.
            jdbc.update("UPDATE user_settings SET device_id=NULL WHERE id=?", existing["id"])
        }
        jdbc.update("UPDATE user_settings SET device_id=? WHERE id=?", target, source["id"])
        jdbc.update("UPDATE game_sessions SET device_id=? WHERE device_id=?", target, "legacy-owner-device")
        jdbc.update("INSERT INTO audit_logs (event_type, action_name, status, response_summary, created_at) VALUES ('USER_SETTING', 'recoverLegacyDevice', 'SUCCESS', '기존 운영자 설정과 게임 신원을 이전했습니다.', CURRENT_TIMESTAMP)")
        return mapOf("recovered" to true)
    }
}
