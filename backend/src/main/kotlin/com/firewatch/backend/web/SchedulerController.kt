package com.firewatch.backend.web

import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.service.SchedulerJob
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
import java.time.LocalTime
import java.time.ZoneId

// Design Ref: §4.1 — POST /api/scheduler/trigger. 디버그·QA용 수동 실행, X-API-Key 필요(ADR 0004).
//
// 202 ACCEPTED를 선언한 대로 실제로 즉시 응답한다 — 파이프라인(Gemini·금융API·뉴스·FCM 합산 최대 수십 초)을
// 응답 전에 기다리면, 여기에 Render 콜드스타트(30~60초)까지 겹쳐 GitHub Actions curl이 타임아웃난다
// (2026-08-20·21 실측, exit 28). API 키 검증만 응답 전에 동기로 하고, 파이프라인 실행은 백그라운드로 넘긴다.
@RestController
@RequestMapping("/api/scheduler")
class SchedulerController(
    private val schedulerJob: SchedulerJob,
    private val userSettingsRepository: UserSettingsRepository,
    @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String,
    @Value("\${firewatch.scheduler.timezone}") private val schedulerTimezone: String,
    @Value("\${firewatch.scheduler.poll-window-minutes}") private val pollWindowMinutes: Long,
) {
    private val triggerScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @PostMapping("/trigger")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun trigger(@RequestHeader("X-API-Key", required = false) apiKey: String?) {
        if (expectedApiKey.isBlank() || apiKey != expectedApiKey) {
            throw UnauthorizedException()
        }
        triggerScope.launch { schedulerJob.triggerManually(apiKey) }
    }

    // 2026-08-23 — 사용자가 Settings에서 바꾼 pushTime이 실제로는 아무 데도 안 읽히고 있었다는 걸
    // 발견(고정 08:00 cron만 있었음). GitHub Actions가 이 엔드포인트를 짧은 주기(poll-window-minutes와
    // 맞물리는 간격)로 계속 호출하고, 여기서 "지금이 pushTime인가"만 판정해 맞을 때만 실제로 돌린다.
    // 판정 로직을 SchedulerJob(service 패키지, AuditLogAspect가 전체를 옵트아웃 없이 감사)이 아니라
    // 컨트롤러에 둔 이유: service 패키지 메서드로 만들면 "확인만 하고 넘어간" 호출까지 전부 SCHEDULER
    // 감사로그로 남아 하루 수십 건씩 노이즈가 쌓인다 — 실제로 실행됐을 때만 감사로그에 남아야 의미가 있다.
    @PostMapping("/trigger-if-due")
    fun triggerIfDue(@RequestHeader("X-API-Key", required = false) apiKey: String?): Map<String, Boolean> {
        if (expectedApiKey.isBlank() || apiKey != expectedApiKey) {
            throw UnauthorizedException()
        }
        val settings = userSettingsRepository.findById(SINGLETON_SETTINGS_ID).orElse(null)
            ?: return mapOf("triggered" to false)
        val now = LocalTime.now(ZoneId.of(schedulerTimezone))
        val due = isDue(settings.pushTime, now, pollWindowMinutes)
        if (due) {
            triggerScope.launch { schedulerJob.triggerManually(apiKey) }
        }
        return mapOf("triggered" to due)
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
    }
}
