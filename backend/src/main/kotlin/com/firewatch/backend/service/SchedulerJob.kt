package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.repository.BriefingRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.LocalDate

/**
 * Design Ref: §2.2 — 매일 08:00 KST(cron `firewatch.scheduler.cron`) 파이프라인 오케스트레이션.
 * 이 클래스 자체가 audit_logs에 event_type=SCHEDULER로 기록되고, 내부에서 부르는
 * [GeminiBriefingService]는 별도로 GEMINI_API 이벤트를 남긴다(둘 다 명세서 1.2절이 요구하는 감사 항목).
 *
 * module-3(BE-4, 금융 API + FALLBACK)이 붙기 전까지는 금/은/환율 필드가 비어 있고
 * `dataSourceStatus`는 항상 NORMAL이다 — 완전한 브리핑은 module-3 완료 후에 나온다.
 */
@Service
class SchedulerJob(
    private val geminiBriefingService: GeminiBriefingService,
    private val briefingRepository: BriefingRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.SCHEDULER

    private val log = LoggerFactory.getLogger(SchedulerJob::class.java)

    @Scheduled(cron = "\${firewatch.scheduler.cron}", zone = "\${firewatch.scheduler.timezone}")
    fun runMorningBriefing() {
        val today = LocalDate.now()
        if (briefingRepository.findByBriefingDate(today) != null) {
            log.info("오늘($today)자 브리핑이 이미 존재해 스킵")
            return
        }

        val result = geminiBriefingService.fetchTodaysBriefing()

        briefingRepository.save(
            Briefing(
                briefingDate = today,
                marketSummary = result.marketSummary,
                recommendedStocksRaw = result.recommendedStocks.toCommaSeparated(),
                dataSourceStatus = DataSourceStatus.NORMAL, // TODO(module-3/BE-4): 금융 API 실패 시 FALLBACK 판정
            ),
        )
        log.info("오늘($today)자 브리핑 저장 완료")
    }
}
