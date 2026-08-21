package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.GeminiBriefingResult
import com.firewatch.backend.client.GeminiClient
import com.firewatch.backend.client.NewsArticleResult
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service
import java.math.BigDecimal

// Design Ref: §2.2 — Gemini 호출을 별도 Service로 분리해 audit_logs에 GEMINI_API 이벤트로 독립 기록되게 한다.
@Service
class GeminiBriefingService(
    private val geminiClient: GeminiClient,
) : AuditedComponent {
    override val auditEventType = AuditEventType.GEMINI_API

    fun fetchTodaysBriefing(
        goldPrice: BigDecimal?,
        silverPrice: BigDecimal?,
        usdKrw: BigDecimal?,
        jpy100Krw: BigDecimal?,
        cnyKrw: BigDecimal?,
        newsArticles: List<NewsArticleResult>,
    ): GeminiBriefingResult =
        geminiClient.fetchMarketBriefing(goldPrice, silverPrice, usdKrw, jpy100Krw, cnyKrw, newsArticles)
}
