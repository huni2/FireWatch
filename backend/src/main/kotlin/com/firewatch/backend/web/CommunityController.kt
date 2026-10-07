package com.firewatch.backend.web

import com.firewatch.backend.repository.AuthSessions
import com.firewatch.backend.service.OperatorAccess
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.sql.Timestamp
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

data class FeedbackInput(val requestId: String, val category: String, val content: String, val platform: String, val version: String = "", val screen: String = "")
data class FeedbackView(val id: String, val category: String, val content: String, val platform: String, val version: String, val screen: String, val status: String, val reply: String, val createdAt: Instant, val updatedAt: Instant)
data class FeedbackUpdate(val status: String, val reply: String)
data class NoticeInput(val title: String, val content: String, val target: String, val popup: Boolean, val startsAt: Instant, val endsAt: Instant?, val published: Boolean)
data class NoticeView(val id: String, val title: String, val content: String, val target: String, val popup: Boolean, val startsAt: Instant, val endsAt: Instant?, val published: Boolean)

/** Private feedback never appears in public notices, audit payloads or push bodies. */
@RestController
@RequestMapping("/api/community")
class CommunityController(private val jdbc: JdbcTemplate, private val sessions: AuthSessions, private val operator: OperatorAccess, private val limiter: SettingsRateLimiter) {
    private fun user(device: String?, auth: String?) = sessions.authenticate(device ?: throw UnauthorizedException("Google 로그인이 필요합니다."), auth)
    private fun bad(message: String): Nothing = throw ValidationException(message, emptyMap())
    private fun feedbackRows(sql: String, vararg args: Any): List<FeedbackView> = jdbc.query(sql, { r, _ -> FeedbackView(r.getString("id"), r.getString("category"), r.getString("content"), r.getString("platform"), r.getString("version"), r.getString("screen"), r.getString("status"), r.getString("reply"), r.getTimestamp("created_at").toInstant(), r.getTimestamp("updated_at").toInstant()) }, *args)
    private fun noticeRows(sql: String, vararg args: Any): List<NoticeView> = jdbc.query(sql, { r, _ -> NoticeView(r.getString("id"), r.getString("title"), r.getString("content"), r.getString("target"), r.getBoolean("popup"), r.getTimestamp("starts_at").toInstant(), r.getTimestamp("ends_at")?.toInstant(), r.getBoolean("published")) }, *args)

    @GetMapping("/feedback")
    fun mine(@RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?) = feedbackRows("SELECT * FROM user_feedback WHERE user_id=? ORDER BY created_at DESC LIMIT 100", user(device, auth))

    @PostMapping("/feedback")
    @Transactional
    fun submit(@RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?, @RequestBody input: FeedbackInput): FeedbackView {
        val owner = user(device, auth)
        val requestId = runCatching { UUID.fromString(input.requestId).toString() }.getOrElse { bad("요청 ID가 올바르지 않습니다.") }
        val id = "$owner:$requestId"
        feedbackRows("SELECT * FROM user_feedback WHERE id=?", id).firstOrNull()?.let { return it }
        if (input.category !in listOf("BUG", "IDEA", "OTHER") || input.platform !in listOf("WEB", "ANDROID") || input.content.trim().length !in 5..3000 || input.version.length > 40 || !input.screen.matches(Regex("[a-zA-Z0-9/_-]{0,100}"))) bad("유형과 5~3000자 내용을 확인해주세요.")
        if (!limiter.allow("feedback:$owner", 3, 3_600_000)) throw TooManyRequestsException("의견은 시간당 3건까지 접수할 수 있습니다.")
        val now = Timestamp.from(Instant.now())
        // Lock the existing account, so retries and concurrent submissions never duplicate tickets.
        jdbc.queryForObject("SELECT id FROM app_users WHERE id=? FOR UPDATE", Long::class.java, owner)
        feedbackRows("SELECT * FROM user_feedback WHERE id=?", id).firstOrNull()?.let { return it }
        if ((jdbc.queryForObject("SELECT COUNT(*) FROM user_feedback WHERE user_id=? AND created_at>?", Long::class.java, owner, Timestamp.from(Instant.now().minusSeconds(3600))) ?: 0) >= 3) throw TooManyRequestsException("의견은 시간당 3건까지 접수할 수 있습니다.")
        jdbc.update("INSERT INTO user_feedback (id,user_id,category,content,platform,version,screen,status,reply,created_at,updated_at,push_attempts) VALUES (?,?,?,?,?,?,?,'NEW','',?,?,0)", id, owner, input.category, input.content.trim(), input.platform, input.version, input.screen, now, now)
        return feedbackRows("SELECT * FROM user_feedback WHERE id=?", id).single()
    }

    @GetMapping("/operator/feedback")
    fun inbox(@RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?, @RequestHeader("X-API-Key", required = false) key: String?, @RequestParam(defaultValue = "0") page: Int): List<FeedbackView> {
        operator.requireOperator(device, auth, key)
        if (page !in 0..10000) bad("페이지가 올바르지 않습니다.")
        return feedbackRows("SELECT * FROM user_feedback ORDER BY created_at DESC LIMIT 50 OFFSET ?", page * 50)
    }

    @PutMapping("/operator/feedback/{id}")
    @Transactional
    fun reply(@PathVariable id: String, @RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?, @RequestHeader("X-API-Key", required = false) key: String?, @RequestBody input: FeedbackUpdate): Map<String, Boolean> {
        operator.requireOperator(device, auth, key)
        if (input.status !in listOf("NEW", "REVIEWING", "RESOLVED", "DEFERRED") || input.reply.length > 3000) bad("상태와 답변 길이를 확인해주세요.")
        if (jdbc.update("UPDATE user_feedback SET status=?,reply=?,updated_at=? WHERE id=?", input.status, input.reply.trim(), Timestamp.from(Instant.now()), id) != 1) throw NotFoundException("접수 내역을 찾을 수 없습니다.")
        audit("community.feedbackReply", "운영자가 문의 답변·상태를 저장했습니다.")
        return mapOf("saved" to true)
    }

    @GetMapping("/notices")
    fun notices(@RequestParam(defaultValue = "WEB") platform: String): List<NoticeView> {
        if (platform !in listOf("WEB", "ANDROID")) bad("플랫폼이 올바르지 않습니다.")
        val now = Timestamp.from(Instant.now())
        return noticeRows("SELECT * FROM community_notices WHERE published=TRUE AND (target='ALL' OR target=?) AND starts_at<=? AND (ends_at IS NULL OR ends_at>?) ORDER BY starts_at DESC LIMIT 100", platform, now, now)
    }

    @GetMapping("/popup")
    fun popup(@RequestParam(defaultValue = "WEB") platform: String, @RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?): List<NoticeView> {
        val owner = if (auth != null || (device != null && sessions.linkedUser(device) != null)) user(device, auth) else null
        if (owner != null && jdbc.query("SELECT hidden_until FROM notice_preferences WHERE user_id=?", { r, _ -> r.getTimestamp(1).toInstant() }, owner).any { it > Instant.now() }) return emptyList()
        return notices(platform).filter { it.popup }.take(10)
    }

    @PostMapping("/hide-today")
    @Transactional
    fun hide(@RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?): Map<String, Instant> {
        val owner = user(device, auth)
        val until = Instant.now().atZone(ZoneId.of("Asia/Seoul")).toLocalDate().plusDays(1).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant()
        jdbc.queryForObject("SELECT id FROM app_users WHERE id=? FOR UPDATE", Long::class.java, owner)
        if (jdbc.update("UPDATE notice_preferences SET hidden_until=? WHERE user_id=?", Timestamp.from(until), owner) == 0) jdbc.update("INSERT INTO notice_preferences (user_id,hidden_until) VALUES (?,?)", owner, Timestamp.from(until))
        return mapOf("hiddenUntil" to until)
    }

    @GetMapping("/operator/notices")
    fun allNotices(@RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?, @RequestHeader("X-API-Key", required = false) key: String?): List<NoticeView> {
        operator.requireOperator(device, auth, key)
        return noticeRows("SELECT * FROM community_notices ORDER BY starts_at DESC LIMIT 100")
    }

    @PostMapping("/operator/notices")
    @Transactional
    fun createNotice(@RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?, @RequestHeader("X-API-Key", required = false) key: String?, @RequestBody input: NoticeInput): NoticeView {
        operator.requireOperator(device, auth, key)
        validateNotice(input)
        val id = UUID.randomUUID().toString()
        jdbc.update("INSERT INTO community_notices (id,title,content,target,popup,starts_at,ends_at,published) VALUES (?,?,?,?,?,?,?,?)", id, input.title.trim(), input.content.trim(), input.target, input.popup, Timestamp.from(input.startsAt), input.endsAt?.let(Timestamp::from), input.published)
        audit("community.noticeCreate", "운영자가 공지를 작성했습니다.")
        return noticeRows("SELECT * FROM community_notices WHERE id=?", id).single()
    }

    @PutMapping("/operator/notices/{id}")
    @Transactional
    fun updateNotice(@PathVariable id: String, @RequestHeader("X-Device-Id", required = false) device: String?, @RequestHeader("Authorization", required = false) auth: String?, @RequestHeader("X-API-Key", required = false) key: String?, @RequestBody input: NoticeInput): Map<String, Boolean> {
        operator.requireOperator(device, auth, key)
        validateNotice(input)
        if (jdbc.update("UPDATE community_notices SET title=?,content=?,target=?,popup=?,starts_at=?,ends_at=?,published=? WHERE id=?", input.title.trim(), input.content.trim(), input.target, input.popup, Timestamp.from(input.startsAt), input.endsAt?.let(Timestamp::from), input.published, id) != 1) throw NotFoundException("공지를 찾을 수 없습니다.")
        audit("community.noticeUpdate", "운영자가 공지 내용·게시 상태를 변경했습니다.")
        return mapOf("saved" to true)
    }
    private fun validateNotice(input: NoticeInput) {
        if (input.title.trim().length !in 1..100 || input.content.trim().length !in 1..5000 || input.target !in listOf("ALL", "WEB", "ANDROID") || (input.endsAt != null && input.endsAt <= input.startsAt)) bad("제목·본문·대상과 게시 기간을 확인해주세요.")
    }
    private fun audit(action: String, summary: String) {
        jdbc.update("INSERT INTO audit_logs (event_type,action_name,status,response_summary,created_at) VALUES ('USER_SETTING',?,'SUCCESS',?,?)", action, summary, Timestamp.from(Instant.now()))
    }
}
