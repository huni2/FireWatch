package com.firewatch.backend.web

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import com.firewatch.backend.service.OperatorAccess
import com.firewatch.backend.repository.SettingsIdentityResolver
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.webPushSubscriptions
import java.time.Instant

data class CollectionAlertResponse(val id: String, val category: String, val message: String, val paused: Boolean, val updatedAt: Instant)

/** Public operational notices contain no device, portfolio, symbol or provider credentials. */
@RestController
@RequestMapping("/api/collection")
class CollectionStatusController(private val jdbc: JdbcTemplate, private val identity: SettingsIdentityResolver,
    private val operatorAccess: OperatorAccess,
    private val push: com.firewatch.backend.service.PushService,
    private val limiter: SettingsRateLimiter) {
    @PostMapping("/operator")
    fun registerOperator(@RequestHeader("X-API-Key", required = false) apiKey: String?, @RequestHeader("X-Device-Id", required = false) deviceId: String?,
                         @RequestHeader("Authorization", required = false) authorization: String?): Map<String, Boolean> {
        operatorAccess.requireOperator(deviceId, authorization, apiKey)
        val settings = identity.resolveForDevice(deviceId.requireDeviceId())
        if (settings.fcmTokens().isEmpty() && settings.webPushSubscriptions().isEmpty()) throw ConflictException("이 기기에서 먼저 알림 권한과 푸시 등록을 완료해주세요.")
        if (jdbc.update("UPDATE collection_operator SET settings_id=? WHERE id=1", settings.id) == 0) jdbc.update("INSERT INTO collection_operator (id, settings_id) VALUES (1, ?)", settings.id)
        return mapOf("registered" to true)
    }
    @PostMapping("/operator/test")
    fun test(@RequestHeader("X-API-Key", required = false) apiKey: String?,
             @RequestHeader("X-Device-Id", required = false) deviceId: String?,
             @RequestHeader("Authorization", required = false) authorization: String?): com.firewatch.backend.service.PushSendResult {
        operatorAccess.requireOperator(deviceId, authorization, apiKey)
        val settings = identity.resolveForDevice(deviceId.requireDeviceId())
        val owner = jdbc.query("SELECT settings_id FROM collection_operator WHERE id=1", { row, _ -> row.getLong(1) }).firstOrNull()
        if (owner != settings.id) throw ConflictException("현재 계정을 운영자 푸시 수신자로 먼저 등록해주세요.")
        if (settings.fcmTokens().isEmpty() && settings.webPushSubscriptions().isEmpty()) throw ConflictException("이 기기에서 먼저 알림 권한과 푸시 등록을 완료해주세요.")
        if (!limiter.allow("operator-push-test", maxRequests = 1, windowMs = 60_000)) throw TooManyRequestsException()
        return push.testOperatorNotification(settings)
    }
    @GetMapping("/alerts")
    fun alerts(): List<CollectionAlertResponse> = jdbc.query(
        "SELECT id, category, message, paused, updated_at FROM collection_alerts WHERE resolved_at IS NULL ORDER BY updated_at DESC",
        { row, _ -> CollectionAlertResponse(row.getString("id"), row.getString("category"), row.getString("message"), row.getBoolean("paused"), row.getTimestamp("updated_at").toInstant()) },
    ).distinctBy { it.category }
}
