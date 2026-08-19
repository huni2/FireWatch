package com.firewatch.backend.web

import com.firewatch.backend.service.SchedulerJob
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

// Design Ref: §4.1 — POST /api/scheduler/trigger. 디버그·QA용 수동 실행, X-API-Key 필요(ADR 0004).
@RestController
@RequestMapping("/api/scheduler")
class SchedulerController(
    private val schedulerJob: SchedulerJob,
) {
    @PostMapping("/trigger")
    @ResponseStatus(HttpStatus.ACCEPTED)
    suspend fun trigger(@RequestHeader("X-API-Key", required = false) apiKey: String?) {
        withContext(Dispatchers.IO) { schedulerJob.triggerManually(apiKey) }
    }
}
