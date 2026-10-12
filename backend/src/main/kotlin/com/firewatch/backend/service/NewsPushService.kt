package com.firewatch.backend.service

import com.firewatch.backend.entity.interestKeywords
import com.firewatch.backend.entity.fcmTokens
import com.firewatch.backend.entity.webPushSubscriptions
import com.firewatch.backend.repository.NewsFeedRepository
import com.firewatch.backend.repository.UserSettingsRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.Duration

internal object NotificationDispatchLock { val monitor = Any() }

@Service
class NewsPushService(private val news: NewsFeedRepository, private val users: UserSettingsRepository, private val push: PushService) {
    // One Render process: serialize polls; no per-article sends or immediate retry loop.
    fun notifyNewArticles(now: Instant): Unit = synchronized(NotificationDispatchLock.monitor) {
        users.findAll().filter { it.newsPushEnabled && it.interestKeywords().isNotEmpty() && (it.fcmTokens().isNotEmpty() || it.webPushSubscriptions().isNotEmpty()) }.forEach { row ->
            val cursor = row.newsPushCursor ?: now
            if (row.newsPushAttemptAt?.let { Duration.between(it, now).toMinutes() < 60 } == true) return@forEach
            val articles = news.findTop50ByCollectedAtAfterOrderByCollectedAtAsc(cursor)
            if (articles.isEmpty()) return@forEach
            val seen = row.newsPushSeenIds.orEmpty().split(',').filter { it.isNotBlank() }
            val matches = articles.filter { item -> item.id !in seen && item.pubDate?.isBefore(now.minusSeconds(86400)) != true && row.interestKeywords().any { keyword -> (item.title + " " + item.description).contains(keyword, ignoreCase = true) } }
            row.newsPushCursor = articles.last().collectedAt
            if (matches.isNotEmpty()) {
                row.newsPushAttemptAt = now
                // Remember an attempted batch even if delivery fails: no unlimited retries.
                row.newsPushSeenIds = (seen + matches.map { it.id }).distinct().takeLast(200).joinToString(",")
                push.notifyNews(row, "관심 키워드 관련 새 소식 ${matches.size}건 · ${matches.first().title}")
            }
            users.save(row)
        }
    }
}
