package com.firewatch.backend.repository

import com.firewatch.backend.web.UnauthorizedException
import com.firewatch.backend.web.NotFoundException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.time.Instant
import java.sql.Timestamp

data class LoginSession(val token: String, val expiresAt: Instant)
data class LinkedDevice(val id: String, val linkedAt: Instant, val current: Boolean)

/** Only token hashes are persisted. A Google login replaces the device's previous session. */
@Repository
class AuthSessions(private val jdbc: JdbcTemplate) {
    private val random = SecureRandom()
    private fun hash(value: String) = MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }

    @Transactional
    fun issue(deviceId: String, now: Instant = Instant.now()): LoginSession {
        val userId = jdbc.query("SELECT user_id FROM device_links WHERE device_id=? FOR UPDATE", { row, _ -> row.getLong(1) }, deviceId).firstOrNull() ?: throw UnauthorizedException()
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also(random::nextBytes))
        val expiry = now.plusSeconds(30L * 24 * 3600).truncatedTo(java.time.temporal.ChronoUnit.MILLIS)
        jdbc.update("DELETE FROM auth_sessions WHERE device_id=?", deviceId)
        jdbc.update("INSERT INTO auth_sessions (token_hash, device_id, user_id, expires_at) VALUES (?, ?, ?, ?)", hash(token), deviceId, userId, Timestamp.from(expiry))
        return LoginSession(token, expiry)
    }

    fun linkedUser(deviceId: String): Long? = jdbc.query("SELECT user_id FROM device_links WHERE device_id=?", { row, _ -> row.getLong(1) }, deviceId).firstOrNull()

    fun authenticate(deviceId: String, authorization: String?, now: Instant = Instant.now()): Long {
        val token = authorization?.takeIf { it.startsWith("Bearer ") }?.substring(7)
            ?.takeIf { it.length in 40..64 } ?: throw UnauthorizedException("로그인이 만료되었습니다. Google 계정으로 다시 로그인해주세요.")
        return jdbc.query("""SELECT s.user_id FROM auth_sessions s JOIN device_links d ON s.device_id=d.device_id AND s.user_id=d.user_id
            WHERE s.token_hash=? AND s.device_id=? AND s.expires_at>?""", { row, _ -> row.getLong(1) }, hash(token), deviceId, Timestamp.from(now)).firstOrNull()
            ?: throw UnauthorizedException("로그인이 만료되었습니다. Google 계정으로 다시 로그인해주세요.")
    }

    fun devices(deviceId: String, authorization: String?): List<LinkedDevice> {
        val userId = authenticate(deviceId, authorization)
        return jdbc.query("SELECT device_id, linked_at FROM device_links WHERE user_id=? ORDER BY linked_at DESC", { row, _ ->
            val id = row.getString(1)
            LinkedDevice(hash(id).take(16), row.getTimestamp(2).toInstant(), id == deviceId)
        }, userId)
    }

    @Transactional
    fun revokeDevice(deviceId: String, authorization: String?, targetId: String) {
        val userId = authenticate(deviceId, authorization)
        val target = jdbc.query("SELECT device_id FROM device_links WHERE user_id=?", { row, _ -> row.getString(1) }, userId)
            .firstOrNull { hash(it).take(16) == targetId } ?: throw NotFoundException("연결된 기기를 찾을 수 없습니다.")
        unlink(target)
    }

    @Transactional
    fun logout(deviceId: String, authorization: String?) {
        authenticate(deviceId, authorization)
        unlink(deviceId)
    }

    private fun unlink(deviceId: String) {
        jdbc.update("DELETE FROM auth_sessions WHERE device_id=?", deviceId)
        jdbc.update("DELETE FROM device_links WHERE device_id=?", deviceId)
    }

    fun revokeAccount(userId: Long) { jdbc.update("DELETE FROM auth_sessions WHERE user_id=?", userId) }
}
