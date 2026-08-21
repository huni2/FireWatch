package com.firewatch.backend.web

import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.repository.NewsArticleRepository
import com.firewatch.backend.web.dto.BriefingResponse
import com.firewatch.backend.web.dto.toResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.ZoneId

// Design Ref: §4.1 — GET /api/briefings/latest, GET /api/briefings?from=&to=
@RestController
@RequestMapping("/api/briefings")
class BriefingController(
    private val briefingRepository: BriefingRepository,
    private val newsArticleRepository: NewsArticleRepository,
    @Value("\${firewatch.scheduler.timezone}") private val schedulerTimezone: String,
) {
    // JPA(블로킹)를 WebFlux 이벤트 루프에서 직접 부르지 않도록 IO 디스패처로 옮긴다.
    @GetMapping("/latest")
    suspend fun latest(): BriefingResponse = withContext(Dispatchers.IO) {
        // 컨테이너 기본 타임존(UTC로 추정)이 아니라 스케줄러와 같은 존을 명시적으로 써야 한다 —
        // SchedulerJob과 같은 버그(KST 08:00~09:00 사이엔 UTC 날짜가 하루 밀려 있음)가 여기도
        // 있었다(2026-08-21 실측 발견, SchedulerJob 수정 때 같이 잡음).
        val today = LocalDate.now(ZoneId.of(schedulerTimezone))
        val briefing = briefingRepository.findByBriefingDate(today)
            ?: throw NotFoundException("오늘자 브리핑이 아직 생성되지 않았습니다.")
        briefing.toResponse(newsArticleRepository.findByBriefingId(briefing.id!!))
    }

    @GetMapping
    suspend fun list(
        @RequestParam(required = false) from: LocalDate?,
        @RequestParam(required = false) to: LocalDate?,
    ): List<BriefingResponse> = withContext(Dispatchers.IO) {
        val effectiveTo = to ?: LocalDate.now(ZoneId.of(schedulerTimezone))
        val effectiveFrom = from ?: effectiveTo.minusDays(DEFAULT_HISTORY_DAYS)
        briefingRepository.findByBriefingDateBetweenOrderByBriefingDateDesc(effectiveFrom, effectiveTo)
            .map { it.toResponse(newsArticleRepository.findByBriefingId(it.id!!)) }
    }

    companion object {
        private const val DEFAULT_HISTORY_DAYS = 30L
    }
}
