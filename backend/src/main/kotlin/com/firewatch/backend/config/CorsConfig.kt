package com.firewatch.backend.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.reactive.config.CorsRegistry
import org.springframework.web.reactive.config.WebFluxConfigurer

/**
 * Design 문서가 놓친 부분 — Web(Cloudflare Pages)과 Backend(Oracle Cloud)는 다른 오리진이라 CORS
 * 설정 없이는 브라우저가 API 호출을 막는다(로컬 dev도 5173↔8080으로 마찬가지). module-7 UI 확인 중 발견.
 * 배포 후에는 `FIREWATCH_ALLOWED_ORIGINS`에 실제 Cloudflare Pages 도메인을 추가해야 한다(BE-8/WEB-5).
 */
@Configuration
class CorsConfig(
    @Value("\${firewatch.allowed-origins}") private val allowedOrigins: List<String>,
) : WebFluxConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(*allowedOrigins.toTypedArray())
            .allowedMethods("GET", "PUT", "POST", "DELETE", "OPTIONS")
            .allowedHeaders("*")
    }
}
