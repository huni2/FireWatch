package com.firewatch.backend.entity

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "news_feed")
class NewsFeedItem(
    @Id var id: String = "",
    @Column(length = 500) var title: String = "",
    @Column(length = 1000) var link: String = "",
    @Column(length = 1000) var description: String = "",
    var pubDate: Instant? = null,
    var collectedAt: Instant = Instant.now(),
)

@Entity
@Table(name = "collection_runs")
class CollectionRun(@Id var id: String = "", var completedAt: Instant = Instant.now())
