package com.firewatch.backend.web

import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.web.dto.BriefingResponse
import com.firewatch.backend.web.dto.toResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

// Design Ref: §4.1 — GET /api/briefings/latest, GET /api/briefings?from=&to=
@RestController
@RequestMapping("/api/briefings")
class BriefingController(
    private val briefingRepository: BriefingRepository,
) {
    // JPA(블로킹)를 WebFlux 이벤트 루프에서 직접 부르지 않도록 IO 디스패처로 옮긴다.
    @GetMapping("/latest")
    suspend fun latest(): BriefingResponse = withContext(Dispatchers.IO) {
        val briefing = briefingRepository.findByBriefingDate(LocalDate.now())
            ?: throw NotFoundException("오늘자 브리핑이 아직 생성되지 않았습니다.")
        briefing.toResponse()
    }

    @GetMapping
    suspend fun list(
        @RequestParam(required = false) from: LocalDate?,
        @RequestParam(required = false) to: LocalDate?,
    ): List<BriefingResponse> = withContext(Dispatchers.IO) {
        val effectiveTo = to ?: LocalDate.now()
        val effectiveFrom = from ?: effectiveTo.minusDays(DEFAULT_HISTORY_DAYS)
        briefingRepository.findByBriefingDateBetweenOrderByBriefingDateDesc(effectiveFrom, effectiveTo)
            .map { it.toResponse() }
    }

    companion object {
        private const val DEFAULT_HISTORY_DAYS = 30L
    }
}
