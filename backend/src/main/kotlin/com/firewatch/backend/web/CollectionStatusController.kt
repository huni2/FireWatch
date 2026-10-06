package com.firewatch.backend.web

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.beans.factory.annotation.Value
import com.firewatch.backend.repository.SettingsIdentityResolver
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.webPushSubscriptions
import java.time.Instant

data class CollectionAlertResponse(val id: String, val category: String, val message: String, val paused: Boolean, val updatedAt: Instant)

/** Public operational notices contain no device, portfolio, symbol or provider credentials. */
@RestController
@RequestMapping("/api/collection")
class CollectionStatusController(private val jdbc: JdbcTemplate, private val identity: SettingsIdentityResolver,
    @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String) {
    @PostMapping("/operator")
    fun registerOperator(@RequestHeader("X-API-Key", required = false) apiKey: String?, @RequestHeader("X-Device-Id", required = false) deviceId: String?): Map<String, Boolean> {
        if (expectedApiKey.isBlank() || expectedApiKey != apiKey) throw UnauthorizedException()
        val settings = identity.resolveForDevice(deviceId.requireDeviceId())
        if (settings.fcmTokens().isEmpty() && settings.webPushSubscriptions().isEmpty()) throw ConflictException("이 기기에서 먼저 알림 권한과 푸시 등록을 완료해주세요.")
        if (jdbc.update("UPDATE collection_operator SET settings_id=? WHERE id=1", settings.id) == 0) jdbc.update("INSERT INTO collection_operator (id, settings_id) VALUES (1, ?)", settings.id)
        return mapOf("registered" to true)
    }
    @GetMapping("/alerts")
    fun alerts(): List<CollectionAlertResponse> = jdbc.query(
        "SELECT id, category, message, paused, updated_at FROM collection_alerts WHERE resolved_at IS NULL ORDER BY updated_at DESC",
        { row, _ -> CollectionAlertResponse(row.getString("id"), row.getString("category"), row.getString("message"), row.getBoolean("paused"), row.getTimestamp("updated_at").toInstant()) },
    ).distinctBy { it.category }
}
