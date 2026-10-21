// 서버 기동 후 실행 가능한 미완료 작업만 골라 실제 복구와 저장 분석 재사용을 이어간다.
package com.firewatch.backend.scheduling

import com.firewatch.backend.client.GeminiCallBudget
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.service.RecommendationReportService
import com.firewatch.backend.service.SchedulerJob
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.sql.Timestamp
import java.time.Clock
import java.time.LocalTime
import java.time.ZoneId

@Component
@ConditionalOnProperty(name = ["firewatch.scheduler.recovery-enabled"], havingValue = "true", matchIfMissing = true)
class BriefingRecoveryScheduler(
    private val scheduler: SchedulerJob,
    private val recommendations: RecommendationReportService,
    private val briefings: BriefingRepository,
    private val jdbc: JdbcTemplate,
    private val budget: GeminiCallBudget,
    @Value("\${firewatch.scheduler.generate-after}") private val generateAfter: String,
    @Value("\${firewatch.scheduler.timezone}") private val timezone: String,
    private val clock: Clock = Clock.systemUTC(),
) {
    @Scheduled(fixedDelayString = "\${firewatch.scheduler.recovery-delay-ms:300000}", initialDelayString = "10000")
    fun recoverIfDue() {
        val now = clock.instant()
        val local = now.atZone(ZoneId.of(timezone))
        if (local.toLocalTime().isBefore(LocalTime.parse(generateAfter))) return
        val today = local.toLocalDate()
        val key = "briefing:$today"
        val at = Timestamp.from(now)
        if (briefings.findByBriefingDate(today)?.dataSourceStatus != DataSourceStatus.NORMAL && !budget.exhausted(now)) {
            val blocked = jdbc.queryForObject("""SELECT COUNT(*) FROM collection_circuits WHERE id=?
                AND (failure_count>=3 OR lease_until>? OR next_attempt_at>?)""", Int::class.java, key, at, at) ?: 0
            val jobBlocked = jdbc.queryForObject("""SELECT COUNT(*) FROM collection_jobs WHERE id=?
                AND (status='PAUSED' OR failure_count>=3 OR lease_until>? OR next_attempt_at>?)""", Int::class.java, key, at, at) ?: 0
            // 최종 실행 여부와 소유권 검증은 기존 CollectionJobRunner가 담당한다.
            if (blocked == 0 && jobBlocked == 0) scheduler.runMorningBriefing()
        }
        if (briefings.findByBriefingDate(today)?.dataSourceStatus == DataSourceStatus.NORMAL &&
            jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_reports WHERE analysis_date=?", Int::class.java, today) == 0) {
            recommendations.collectIfDue(now)
        }
    }
}
