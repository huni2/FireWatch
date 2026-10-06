package com.firewatch.backend.repository

import com.firewatch.backend.entity.*
import org.springframework.data.jpa.repository.JpaRepository

interface NewsFeedRepository : JpaRepository<NewsFeedItem, String> {
    fun findTop50ByOrderByPubDateDescCollectedAtDesc(): List<NewsFeedItem>
}
interface CollectionRunRepository : JpaRepository<CollectionRun, String>
