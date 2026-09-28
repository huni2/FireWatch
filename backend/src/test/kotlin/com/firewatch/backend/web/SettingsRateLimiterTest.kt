package com.firewatch.backend.web

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SettingsRateLimiterTest {
    @Test
    fun `한도를 넘으면 같은 키의 요청은 거부된다`() {
        val limiter = SettingsRateLimiter()

        assertTrue(limiter.allow("1.2.3.4", maxRequests = 2))
        assertTrue(limiter.allow("1.2.3.4", maxRequests = 2))
        assertFalse(limiter.allow("1.2.3.4", maxRequests = 2))
    }

    @Test
    fun `다른 키는 서로 영향을 주지 않는다`() {
        val limiter = SettingsRateLimiter()

        assertTrue(limiter.allow("1.2.3.4", maxRequests = 1))
        assertFalse(limiter.allow("1.2.3.4", maxRequests = 1))
        assertTrue(limiter.allow("5.6.7.8", maxRequests = 1))
    }
}
