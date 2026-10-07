package com.firewatch.backend.web

import com.firewatch.backend.service.RecommendationReportService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.time.ZoneId

@RestController
@RequestMapping("/api/recommendations")
class RecommendationController(private val reports: RecommendationReportService) {
    @GetMapping("/latest")
    suspend fun latest() = withContext(Dispatchers.IO) { reports.latest() }

    @GetMapping
    suspend fun history(@RequestParam from: LocalDate?, @RequestParam to: LocalDate?) = withContext(Dispatchers.IO) {
        val until = to ?: LocalDate.now(ZoneId.of("Asia/Seoul"))
        reports.history(from ?: until.minusDays(30), until)
    }
}
