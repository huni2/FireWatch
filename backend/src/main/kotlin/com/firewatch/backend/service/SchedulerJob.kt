package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditContext
import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.GeminiBriefingResult
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.entity.NewsArticle
import com.firewatch.backend.entity.toCommaSeparated
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.UnauthorizedException
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.ZoneId

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
    private val newsService: NewsService,
    private val pushService: PushService,
    private val briefingRepository: BriefingRepository,
    private val newsArticleRepository: NewsArticleRepository,
    @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String,
    @Value("\${firewatch.scheduler.timezone}") private val schedulerTimezone: String,
) : AuditedComponent {
    override val auditEventType = AuditEventType.SCHEDULER

    private val log = LoggerFactory.getLogger(SchedulerJob::class.java)

    @Scheduled(cron = "\${firewatch.scheduler.cron}", zone = "\${firewatch.scheduler.timezone}")
    fun runMorningBriefing() = executePipeline()

    // Design Ref: §4.1 POST /api/scheduler/trigger — 디버그·QA용 수동 실행, 쓰기 API라 X-API-Key 요구(ADR 0004).
    // runMorningBriefing()을 this로 재호출하지 않고 별도 진입점으로 둔다 — Spring AOP는 같은 빈 안에서
    // this.메서드() 자기호출을 가로채지 못해(self-invocation), 그렇게 하면 이 진입점 자체가 감사로그에
    // 안 남는다. 별도 public 메서드라야 프록시를 거쳐 SCHEDULER 이벤트가 정상적으로 기록된다.
    fun triggerManually(apiKey: String?) {
        if (expectedApiKey.isBlank() || apiKey != expectedApiKey) {
            throw UnauthorizedException()
        }
        executePipeline()
    }

    private fun executePipeline() {
        // 컨테이너 기본 타임존(UTC로 추정)이 아니라 스케줄러와 같은 존을 명시적으로 써야 한다 —
        // KST 08:00은 UTC로 전날 23:00이라, 타임존 없이 LocalDate.now()를 쓰면 자동 실행 때마다
        // "오늘"이 하루 전 날짜로 계산돼 매번 스킵되는 버그가 있었다(2026-08-21 실측 발견).
        val today = LocalDate.now(ZoneId.of(schedulerTimezone))
        if (briefingRepository.findByBriefingDate(today) != null) {
            log.info("오늘($today)자 브리핑이 이미 존재해 스킵")
            return
        }

        val financialSnapshot = runCatching { financialDataService.fetchLatestSnapshot() }
            .onFailure { log.warn("금융 API 실패 — 해당 필드는 비운 채 진행", it) }
            .getOrNull()

        // Gemini가 grounding 없이 이 뉴스를 요약 재료로 쓰므로, 브리핑 저장보다 먼저 가져와둔다
        // ([[llm-wiki/Decisions/0011-gemini-no-grounding]]). 실패해도 빈 목록으로 계속 진행.
        val newsArticles = runCatching { newsService.fetchRelatedNews() }
            .onFailure { log.warn("관련 뉴스 조회 실패 — 빈 목록으로 계속 진행", it) }
            .getOrDefault(emptyList())

        val geminiResult: GeminiBriefingResult? = try {
            geminiBriefingService.fetchTodaysBriefing(
                goldPrice = financialSnapshot?.goldPrice,
                silverPrice = financialSnapshot?.silverPrice,
                usdKrw = financialSnapshot?.usdKrw,
                jpy100Krw = financialSnapshot?.jpy100Krw,
                cnyKrw = financialSnapshot?.cnyKrw,
                newsArticles = newsArticles,
            )
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

        val briefingId = briefing.id ?: error("저장된 Briefing에 id가 없음")
        if (newsArticles.isNotEmpty()) {
            newsArticleRepository.saveAll(
                newsArticles.map { article ->
                    NewsArticle(
                        briefingId = briefingId,
                        title = article.title,
                        link = article.link,
                        description = article.description,
                        pubDate = article.pubDate,
                    )
                },
            )
        }

        runCatching { pushService.sendBriefingNotification(briefing) }
            .onFailure { log.warn("FCM 발송 실패 — 브리핑 저장은 이미 완료됐으므로 스케줄러 자체는 실패로 보지 않음", it) }
    }
}
