package com.firewatch.backend.web

import com.firewatch.backend.service.PortfolioService
import com.firewatch.backend.web.dto.PortfolioUpdateRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/portfolio")
class PortfolioController(private val service: PortfolioService, private val limiter: SettingsRateLimiter) {
    @GetMapping
    suspend fun get(@RequestHeader("X-Device-Id", required = false) deviceId: String?) = withContext(Dispatchers.IO) { service.get(deviceId.requireDeviceId()) }

    @PutMapping
    suspend fun update(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestBody input: PortfolioUpdateRequest) = withContext(Dispatchers.IO) {
        val id = deviceId.requireDeviceId()
        if (!limiter.allow(id)) throw TooManyRequestsException()
        service.update(id, input)
    }
}
