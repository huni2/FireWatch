package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.NewsArticleResult
import com.firewatch.backend.client.NewsRssClient
import com.firewatch.backend.entity.AuditEventType
import org.springframework.stereotype.Service

// 사용자 요청(2026-08-21)으로 추가 — Gemini Search Grounding이 막혀 있어 실제 뉴스 링크를 대신
// 보여준다. RSS 피드는 키워드 검색이 안 되고(NewsRssClient 참고) 이미 "국내 증시" 도메인으로
// 고정된 피드라 최신순 그대로 쓴다 — 관심 키워드 기반 필터링은 하지 않는다(단순함 우선).
@Service
class NewsService(
    private val newsRssClient: NewsRssClient,
) : AuditedComponent {
    override val auditEventType = AuditEventType.NEWS_API

    fun fetchRelatedNews(): List<NewsArticleResult> = newsRssClient.fetchLatest()
}
