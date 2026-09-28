package com.firewatch.backend.web

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

// PUT /api/settings 남용 방지용 최소 방어선 — SETTINGS_API_KEY가 클라이언트 번들(web/mobile)에
// 그대로 박혀 배포되는 구조라(ADR 0004, "진짜 인증 아님") 키 하나만으로는 무제한 반복 호출을 못 막는다.
// Render 인스턴스가 하나뿐인 전제라 Redis 등 분산 저장소 없이 인메모리로 충분하다 — web 패키지에 둬서
// AuditLogAspect(service 패키지 전체 포인트컷)의 감사로그 대상에서 제외한다(내부 방어 로직일 뿐 감사할
// 비즈니스 이벤트가 아님).
@Component
class SettingsRateLimiter {
    private val hits = ConcurrentHashMap<String, MutableList<Long>>()

    fun allow(key: String, maxRequests: Int = MAX_REQUESTS, windowMs: Long = WINDOW_MS): Boolean {
        val now = System.currentTimeMillis()
        val timestamps = hits.computeIfAbsent(key) { mutableListOf() }
        synchronized(timestamps) {
            timestamps.removeAll { now - it > windowMs }
            if (timestamps.size >= maxRequests) return false
            timestamps.add(now)
            return true
        }
    }

    companion object {
        private const val MAX_REQUESTS = 10
        private const val WINDOW_MS = 60_000L
    }
}
