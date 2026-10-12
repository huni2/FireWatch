package com.firewatch.backend.repository

import com.firewatch.backend.entity.*
import org.springframework.data.jpa.repository.JpaRepository

interface NewsFeedRepository : JpaRepository<NewsFeedItem, String> {
    fun findTop50ByCollectedAtAfterOrderByCollectedAtAsc(after: java.time.Instant): List<NewsFeedItem>
    fun findTop50ByOrderByPubDateDescCollectedAtDesc(): List<NewsFeedItem>
}
interface CollectionRunRepository : JpaRepository<CollectionRun, String>
