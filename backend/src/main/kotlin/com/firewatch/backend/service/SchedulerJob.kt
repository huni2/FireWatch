package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditContext
import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.GeminiBriefingResult
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
 * [GeminiBriefingService](GEMINI_API), [FinancialDataService](FINANCIAL_API), [PushService](FCM_PUSH)는
 * 각자 독립된 이벤트로 남는다(명세서 1.2절이 요구하는 감사 항목 그대로).
 *
 * FALLBACK 판정(명세서 5.1절 "Gemini API 장애로 Yahoo/수출입은행 기본 지표로 대체 발송")은
 * **Gemini가 실패했을 때만** 적용한다 — 금융 API만 실패한 경우는 해당 필드만 비운 채 NORMAL로 저장한다
 * (그 실패 자체는 FINANCIAL_API 이벤트에 이미 FAILURE로 남는다). 이 구분은 명세서가 financial-API-only
 * 실패 케이스를 명시하지 않아 이번 Do 단계에서 내린 해석이다 — [[llm-wiki/log]] 2026-08-19 참고.
 */
@Service
class SchedulerJob(
    private val geminiBriefingService: GeminiBriefingService,
    private val financialDataService: FinancialDataService,
    private val pushService: PushService,
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

        val financialSnapshot = runCatching { financialDataService.fetchLatestSnapshot() }
            .onFailure { log.warn("금융 API 실패 — 해당 필드는 비운 채 진행", it) }
            .getOrNull()

        val geminiResult: GeminiBriefingResult? = try {
            geminiBriefingService.fetchTodaysBriefing()
        } catch (ex: Exception) {
            log.warn("Gemini 실패 — FALLBACK으로 처리", ex)
            AuditContext.markFallback("Gemini 실패: ${(ex.message ?: ex.javaClass.simpleName).take(200)}")
            null
        }

        check(geminiResult != null || financialSnapshot != null) {
            "Gemini와 금융 API가 모두 실패해 브리핑을 생성할 수 없음"
        }

        val briefing = briefingRepository.save(
            Briefing(
                briefingDate = today,
                marketSummary = geminiResult?.marketSummary
                    ?: "AI 브리핑 생성에 실패했습니다. 금/은/환율 정보만 제공됩니다.",
                recommendedStocksRaw = geminiResult?.recommendedStocks?.toCommaSeparated(),
                goldPrice = financialSnapshot?.goldPrice,
                silverPrice = financialSnapshot?.silverPrice,
                usdKrw = financialSnapshot?.usdKrw,
                jpy100Krw = financialSnapshot?.jpy100Krw,
                cnyKrw = financialSnapshot?.cnyKrw,
                dataSourceStatus = if (geminiResult == null) DataSourceStatus.FALLBACK else DataSourceStatus.NORMAL,
            ),
        )
        log.info("오늘($today)자 브리핑 저장 완료 (dataSourceStatus=${briefing.dataSourceStatus})")

        runCatching { pushService.sendBriefingNotification(briefing) }
            .onFailure { log.warn("FCM 발송 실패 — 브리핑 저장은 이미 완료됐으므로 스케줄러 자체는 실패로 보지 않음", it) }
    }
}
