package com.firewatch.backend.web

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

// Design Ref: §4.1 — POST /api/scheduler/trigger. 디버그·QA용 수동 실행, X-API-Key 필요(ADR 0004).
//
// 202 ACCEPTED를 선언한 대로 실제로 즉시 응답한다 — 파이프라인(Gemini·금융API·뉴스·FCM 합산 최대 수십 초)을
// 응답 전에 기다리면, 여기에 Render 콜드스타트(30~60초)까지 겹쳐 GitHub Actions curl이 타임아웃난다
// (2026-08-20·21 실측, exit 28). API 키 검증만 응답 전에 동기로 하고, 파이프라인 실행은 백그라운드로 넘긴다.
@RestController
@RequestMapping("/api/scheduler")
class SchedulerController(
    private val schedulerJob: SchedulerJob,
    @Value("\${firewatch.settings.api-key}") private val expectedApiKey: String,
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
}
