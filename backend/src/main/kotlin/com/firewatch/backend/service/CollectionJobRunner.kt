package com.firewatch.backend.service

import org.springframework.dao.DuplicateKeyException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.sql.Timestamp
import java.time.Duration
import java.time.Instant
import java.util.UUID

enum class CollectionOutcome { SKIPPED, SUCCESS, PARTIAL, FAILED, PAUSED }
data class CollectionWrite(val count: Int, val partial: Boolean = false, val missingAssets: List<String> = emptyList())

/** Durable leases and bounded retry backoff. Network calls never hold a DB transaction. */
@Service
class CollectionJobRunner(private val jdbc: JdbcTemplate, private val transaction: TransactionTemplate) {
    fun <T> run(key: String, now: Instant, refresh: Duration? = null, fetch: () -> T, persist: (T) -> CollectionWrite): CollectionOutcome {
        val category = key.substringBefore(':')
        require(category in listOf("news", "financial", "stock", "briefing"))
        val circuit = "$category:${now.atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDate()}"
        try { jdbc.update("INSERT INTO collection_circuits (id, failure_count) VALUES (?, 0)", circuit) }
        catch (_: DuplicateKeyException) { }
        // A category receives at most three failed attempts per KST day, including
        // different symbols/slots. A new job cannot bypass the provider circuit.
        if ((jdbc.queryForObject("SELECT failure_count FROM collection_circuits WHERE id=?", Int::class.java, circuit) ?: 0) >= 3) return CollectionOutcome.PAUSED
        val categoryToken = UUID.randomUUID().toString()
        if (jdbc.update("UPDATE collection_circuits SET lease_token=?, lease_until=? WHERE id=? AND failure_count<3 AND (lease_until IS NULL OR lease_until<=?) AND (next_attempt_at IS NULL OR next_attempt_at<=?)", categoryToken, Timestamp.from(now.plusSeconds(600)), circuit, Timestamp.from(now), Timestamp.from(now)) == 0) return CollectionOutcome.SKIPPED
        return try { runClaimed(key, category, circuit, categoryToken, now, refresh, fetch, persist) }
        finally { jdbc.update("UPDATE collection_circuits SET lease_token=NULL, lease_until=NULL WHERE id=? AND lease_token=?", circuit, categoryToken) }
    }

    private fun <T> runClaimed(key: String, category: String, circuit: String, categoryToken: String, now: Instant, refresh: Duration?, fetch: () -> T, persist: (T) -> CollectionWrite): CollectionOutcome {
        try { jdbc.update("INSERT INTO collection_jobs (id, status, failure_count, collected_count) VALUES (?, 'PENDING', 0, 0)", key) }
        catch (_: DuplicateKeyException) { /* Existing durable job. */ }
        val token = UUID.randomUUID().toString()
        val claimed = jdbc.update("""UPDATE collection_jobs SET status='RUNNING', lease_token=?, lease_until=?, last_attempt_at=?
            WHERE id=? AND (lease_until IS NULL OR lease_until <= ?) AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
            AND status <> 'PAUSED' AND failure_count < 3 AND (status <> 'SUCCESS' OR ?)""", token, Timestamp.from(now.plusSeconds(600)), Timestamp.from(now), key, Timestamp.from(now), Timestamp.from(now), refresh != null)
        if (claimed == 0) return CollectionOutcome.SKIPPED
        val failures = jdbc.queryForObject("SELECT failure_count FROM collection_jobs WHERE id=?", Int::class.java, key) ?: 0
        val retryAt = now.plusSeconds((30L shl failures.coerceAtMost(1)) * 60)
        try {
            val result = fetch()
            return transaction.execute {
                if (jdbc.update("UPDATE collection_circuits SET lease_until=? WHERE id=? AND lease_token=?", Timestamp.from(now.plusSeconds(600)), circuit, categoryToken) != 1) return@execute CollectionOutcome.SKIPPED
                // Lock and verify ownership before writing observations. A expired worker cannot
                // overwrite the replacement worker's result; every write rolls back on failure.
                if (jdbc.update("UPDATE collection_jobs SET lease_until=? WHERE id=? AND lease_token=?", Timestamp.from(now.plusSeconds(600)), key, token) != 1) return@execute CollectionOutcome.SKIPPED
                val saved = persist(result)
                // Only internal asset identifiers, never provider exceptions or URLs.
                val incompleteCode = "INCOMPLETE_DATA" + saved.missingAssets
                    .filter { it.matches(Regex("[A-Z0-9_]{1,30}")) }.take(12)
                    .takeIf { it.isNotEmpty() }?.joinToString(",", prefix = ":").orEmpty()
                val next = if (saved.partial) retryAt else refresh?.let { now.plus(it) }
                jdbc.update("""UPDATE collection_jobs SET status=?, last_success_at=CASE WHEN ? THEN last_success_at ELSE ? END,
                    next_attempt_at=?, failure_count=?, collected_count=?, error_code=?, lease_token=NULL, lease_until=NULL WHERE id=? AND lease_token=?""",
                    if (saved.partial) "PARTIAL" else "SUCCESS", saved.partial, Timestamp.from(now), next?.let(Timestamp::from),
                    if (saved.partial) failures + 1 else 0, saved.count, if (saved.partial) incompleteCode.take(80) else null, key, token)
                if (saved.partial) recordFailure(category, circuit, key, now, incompleteCode)
                else {
                    val dayStart = now.atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDate().atStartOfDay(java.time.ZoneId.of("Asia/Seoul")).toInstant()
                    val pending = jdbc.queryForObject("SELECT COUNT(*) FROM collection_jobs WHERE id LIKE ? AND last_attempt_at>=? AND status IN ('FAILED','PARTIAL','PAUSED')", Int::class.java, "$category:%", Timestamp.from(dayStart)) ?: 0
                    if (pending == 0) jdbc.update("UPDATE collection_alerts SET resolved_at=? WHERE category=? AND resolved_at IS NULL", Timestamp.from(now), category)
                }
                if (saved.partial) CollectionOutcome.PARTIAL else CollectionOutcome.SUCCESS
            }
        } catch (e: Exception) {
            // Never store raw provider exceptions: URLs can contain credentials.
            transaction.executeWithoutResult {
                if (jdbc.update("UPDATE collection_circuits SET lease_until=? WHERE id=? AND lease_token=?", Timestamp.from(now.plusSeconds(600)), circuit, categoryToken) != 1) return@executeWithoutResult
                val changed = jdbc.update("""UPDATE collection_jobs SET status=?, failure_count=failure_count+1,
                    next_attempt_at=?, error_code=?, lease_token=NULL, lease_until=NULL WHERE id=? AND lease_token=?""",
                    if (failures >= 2) "PAUSED" else "FAILED", Timestamp.from(retryAt), e.javaClass.simpleName.take(80), key, token)
                if (changed == 1) recordFailure(category, circuit, key, now, e.javaClass.simpleName.take(80), e is org.springframework.web.reactive.function.client.WebClientResponseException && e.statusCode.value() == 429)
            }
            return CollectionOutcome.FAILED
        }
    }

    private fun recordFailure(category: String, circuit: String, key: String, now: Instant, code: String, halt: Boolean = false) {
        jdbc.update("UPDATE collection_circuits SET failure_count=failure_count+1, next_attempt_at=? WHERE id=?", Timestamp.from(now.plusSeconds(1800)), circuit)
        if (halt) jdbc.update("UPDATE collection_circuits SET failure_count=3 WHERE id=?", circuit)
        val paused = (jdbc.queryForObject("SELECT failure_count FROM collection_circuits WHERE id=?", Int::class.java, circuit) ?: 0) >= 3
        if (paused) jdbc.update("UPDATE collection_jobs SET status='PAUSED' WHERE id=?", key)
        val message = if (paused) "수집 실패 한도 도달. 해당 종류 수집은 다음 한국 날짜까지 중지됩니다." else "수집 실패. 30~60분 간격으로 제한된 재시도만 수행합니다."
        jdbc.update("INSERT INTO audit_logs (event_type, action_name, status, response_summary, created_at) VALUES (?, ?, 'FAILURE', ?, ?)",
            if (category == "news") "NEWS_API" else if (category == "briefing") "SCHEDULER" else "FINANCIAL_API",
            "collection.$category", "$message 오류 코드 $code", Timestamp.from(now))
        // One incident per category/day. Never expose portfolio symbols or provider URLs.
        val updated = jdbc.update("UPDATE collection_alerts SET message=?, updated_at=?, paused=?, resolved_at=NULL WHERE id=?", message, Timestamp.from(now), paused, circuit)
        if (updated == 0) jdbc.update("INSERT INTO collection_alerts (id, category, message, paused, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", circuit, category, message, paused, Timestamp.from(now), Timestamp.from(now))
    }
}
