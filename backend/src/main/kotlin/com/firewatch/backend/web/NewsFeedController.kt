package com.firewatch.backend.web

import com.firewatch.backend.service.NewsArchiveService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.*

@RestController
class NewsFeedController(private val archive: NewsArchiveService) {
    @GetMapping("/api/news")
    suspend fun latest(
        @RequestParam(required = false) from: java.time.LocalDate?,
        @RequestParam(required = false) to: java.time.LocalDate?,
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
    ) = withContext(Dispatchers.IO) { archive.search(from, to, q, page, size) }
}
