// 재시작·동시 실행에도 무료 Gemini HTTP 요청을 한국 날짜별 최대 3회로 제한한다.
package com.firewatch.backend.client

import org.springframework.dao.DuplicateKeyException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionTemplate
import java.time.Instant
import java.time.ZoneId

@Component
class GeminiCallBudget(private val jdbc: JdbcTemplate, private val transaction: TransactionTemplate) {
    fun reserve(now: Instant = Instant.now()): Int? {
        val day = now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate()
        // 이전 서버가 이미 사용한 실패 기회를 배포로 다시 부여하지 않는다.
        val previous = (jdbc.queryForObject("SELECT COALESCE(MAX(failure_count),0) FROM collection_circuits WHERE id=?", Int::class.java, "briefing:$day") ?: 0).coerceIn(0, 3)
        try { jdbc.update("INSERT INTO gemini_daily_usage (usage_date, request_count) VALUES (?, ?)", day, previous) }
        catch (_: DuplicateKeyException) { }
        return transaction.execute {
            if (jdbc.update("UPDATE gemini_daily_usage SET request_count=request_count+1 WHERE usage_date=? AND request_count<3 AND stopped=FALSE", day) != 1) null
            else jdbc.queryForObject("SELECT request_count FROM gemini_daily_usage WHERE usage_date=?", Int::class.java, day)
        }
    }

    fun exhausted(now: Instant = Instant.now()): Boolean =
        (jdbc.queryForObject("SELECT COUNT(*) FROM gemini_daily_usage WHERE usage_date=? AND (request_count>=3 OR stopped=TRUE)", Int::class.java,
            now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate()) ?: 0) > 0

    fun stop(now: Instant = Instant.now()) {
        jdbc.update("UPDATE gemini_daily_usage SET stopped=TRUE WHERE usage_date=?", now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate())
    }
}

class GeminiCallException(val httpStatus: Int?, val budgetExhausted: Boolean, model: String, val requestAttempted: Boolean = true) :
    IllegalStateException(if (!requestAttempted) "GEMINI_DAILY_LIMIT: 오늘의 HTTP 호출 예산이 소진됐습니다."
        else "${httpStatus ?: "GEMINI_UNAVAILABLE"} Gemini 호출 실패 (model=$model, dailyBudgetExhausted=$budgetExhausted)")
