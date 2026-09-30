package com.firewatch.backend.web

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

// Render healthCheckPath 전용 — 인증·감사로그 등 업무 로직과 절대 엮이면 안 된다.
// 공개 배포 전환(ADR 0012)으로 /api/settings가 X-Device-Id를 요구하게 되면서 그걸 헬스체크로
// 쓰던 render.yaml이 배포 자체를 실패시킨 사고가 있었다 — 그 재발 방지용.
@RestController
class HealthController {
    @GetMapping("/api/health")
    fun health(): String = "OK"
}
