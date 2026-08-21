package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.NaverNewsApiClient
import com.firewatch.backend.client.NewsArticleResult
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.SINGLETON_SETTINGS_ID
import com.firewatch.backend.entity.interestKeywords
import com.firewatch.backend.repository.UserSettingsRepository
import org.springframework.stereotype.Service

// 사용자 요청(2026-08-21)으로 추가 — Gemini Search Grounding이 막혀 있어 대신 실제 뉴스 링크를
// 보여준다. 사용자가 설정한 관심 키워드(user_settings.interest_keywords)가 있으면 그걸로 검색하고,
// 없으면 기본 검색어("코스피 증시")를 쓴다.
@Service
class NewsService(
    private val naverNewsApiClient: NaverNewsApiClient,
    private val userSettingsRepository: UserSettingsRepository,
) : AuditedComponent {
    override val auditEventType = AuditEventType.NEWS_API

    fun fetchRelatedNews(): List<NewsArticleResult> {
        val keywords = userSettingsRepository.findById(SINGLETON_SETTINGS_ID).orElse(null)?.interestKeywords().orEmpty()
        val query = if (keywords.isEmpty()) DEFAULT_QUERY else keywords.joinToString(" ")
        return naverNewsApiClient.searchNews(query)
    }

    companion object {
        private const val DEFAULT_QUERY = "코스피 증시"
    }
}
