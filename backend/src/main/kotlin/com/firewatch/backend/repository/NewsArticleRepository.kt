package com.firewatch.backend.repository

import com.firewatch.backend.entity.NewsArticle
import org.springframework.data.jpa.repository.JpaRepository

interface NewsArticleRepository : JpaRepository<NewsArticle, Long> {
    fun findByBriefingId(briefingId: Long): List<NewsArticle>
    fun findByBriefingIdIn(briefingIds: List<Long>): List<NewsArticle>
}
