package com.firewatch.backend.web

import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.service.PushService
import com.firewatch.backend.service.SchedulerJob
import com.firewatch.backend.service.MarketCollectionService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

// Design Ref: §4.1 — POST /api/scheduler/trigger. 디버그·QA용 수동 실행, X-API-Key 필요(ADR 0004).
// 공개 배포 전환(2026-09) 이후 이 키는 설정 API가 아니라 스케줄러 관리 전용이다 — 설정 쓰기는
// X-Device-Id로 대체됐다(SettingsController 참고).
//
// 202 ACCEPTED를 선언한 대로 실제로 즉시 응답한다 — 파이프라인(Gemini·금융API·뉴스·FCM 합산 최대 수십 초)을
// 응답 전에 기다리면, 여기에 Render 콜드스타트(30~60초)까지 겹쳐 GitHub Actions curl이 타임아웃난다
// (2026-08-20·21 실측, exit 28). API 키 검증만 응답 전에 동기로 하고, 파이프라인 실행은 백그라운드로 넘긴다.
@RestController
@RequestMapping("/api/scheduler")
class SchedulerController(
    private val schedulerJob: SchedulerJob,
    private val pushService: PushService,
    private val briefingRepository: BriefingRepository,
    private val userSettingsRepository: UserSettingsRepository,
    private val operatorAccess: com.firewatch.backend.service.OperatorAccess,
    @Value("\${firewatch.scheduler.timezone}") private val schedulerTimezone: String,
    @Value("\${firewatch.scheduler.poll-window-minutes}") private val pollWindowMinutes: Long,
    @Value("\${firewatch.scheduler.generate-after}") private val generateAfter: String,
    private val marketCollection: MarketCollectionService,
    private val recommendations: com.firewatch.backend.service.RecommendationReportService,
    private val operationsPush: com.firewatch.backend.service.OperationsPushService,
) {
    private val triggerScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @PostMapping("/trigger")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun trigger(@RequestHeader("X-API-Key", required = false) apiKey: String?,
                @RequestHeader("X-Device-Id", required = false) deviceId: String?,
                @RequestHeader("Authorization", required = false) authorization: String?) {
        operatorAccess.requireOperator(deviceId, authorization, apiKey)
        triggerScope.launch { schedulerJob.triggerManually(apiKey, deviceId, authorization); recommendations.collectIfDue(); operationsPush.flush(java.time.Instant.now()) }
    }

    // 2026-08-23 — pushTime을 실제로 반영하려고 GitHub Actions가 이 엔드포인트를 짧은 주기로 폴링한다.
    // 공개 배포 전환(2026-09) 이후로는 사용자마다 pushTime이 달라서, 매 폴링마다 두 가지를 독립적으로
    // 시도한다 — ① 오늘자 브리핑이 아직 없고 생성 기준 시각(generateAfter)을 지났으면 생성 파이프라인
    // 실행(전역, 하루 1회, SchedulerJob이 멱등 보장). ② 오늘자 브리핑이 이미 있으면, 지금 자기
    // pushTime이 된 행이 하나라도 있는지 먼저 가볍게 확인하고(없으면 PushService를 아예 안 부른다 —
    // 매 폴링마다 "보낼 사람 없음" 감사로그가 하루 수십 건씩 쌓이는 걸 피하려는 것, SCHEDULER 판정
    // 로직을 컨트롤러에 둔 원래 이유와 같은 맥락) 있으면 PushService.notifyDueUsers()에 실제 발송을
    // 맡긴다(이미 보낸 행은 lastNotifiedDate로 알아서 건너뜀).
    @PostMapping("/trigger-if-due")
    fun triggerIfDue(@RequestHeader("X-API-Key", required = false) apiKey: String?,
                     @RequestHeader("X-Device-Id", required = false) deviceId: String?,
                     @RequestHeader("Authorization", required = false) authorization: String?): Map<String, Boolean> {
        operatorAccess.requireOperator(deviceId, authorization, apiKey)
        val zone = ZoneId.of(schedulerTimezone)
        val now = LocalTime.now(zone)
        val today = LocalDate.now(zone)
        val briefing = briefingRepository.findByBriefingDate(today)
        triggerScope.launch { marketCollection.collectIfDue(); recommendations.collectIfDue(); operationsPush.flush(java.time.Instant.now()) }

        var triggered = false
        if (briefing == null) {
            if (now.isAfter(LocalTime.parse(generateAfter))) {
                triggerScope.launch { schedulerJob.triggerManually(apiKey, deviceId, authorization); recommendations.collectIfDue(); operationsPush.flush(java.time.Instant.now()) }
                triggered = true
            }
        } else {
            val hasDueRecipient = userSettingsRepository.findAll()
                .any { isRowDue(it, now, pollWindowMinutes, today) }
            if (hasDueRecipient) {
                triggerScope.launch { pushService.notifyDueUsers(briefing, now, pollWindowMinutes, today) }
                triggered = true
            }
        }
        return mapOf("triggered" to triggered)
    }

    companion object {
        private const val MINUTES_PER_DAY = 24 * 60

        // FinancialApiClient의 순수 파싱 함수와 동일 관례 — 벽시계 의존 없이 단위테스트하려고 분리.
        // 자정을 넘나드는 pushTime(예: 23:55)도 다루기 위해 하루(1440분) 기준으로 정규화한다.
        fun isDue(pushTime: String, now: LocalTime, windowMinutes: Long): Boolean {
            val target = LocalTime.parse(pushTime)
            val diffMinutes = ((now.toSecondOfDay() - target.toSecondOfDay()) / 60 + MINUTES_PER_DAY) % MINUTES_PER_DAY
            return diffMinutes < windowMinutes
        }

        // 2026-08-31 도입한 "그날 안에 놓친 창을 따라잡는다" 규칙을 행 단위로 일반화한 버전
        // (PushService·이 컨트롤러의 사전 확인 양쪽에서 재사용) — 이미 오늘 보낸 행은 항상 제외한다.
        fun isRowDue(row: UserSettings, now: LocalTime, windowMinutes: Long, today: LocalDate): Boolean =
            row.lastNotifiedDate != today &&
                (isDue(row.pushTime, now, windowMinutes) || now.isAfter(LocalTime.parse(row.pushTime)))
    }
}
