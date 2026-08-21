package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

// Design Ref: §3.1 — user_settings. 계정이 없으므로 항상 단일 행(id=1, schema.sql이 시드).
const val SINGLETON_SETTINGS_ID = 1L

@Entity
@Table(name = "user_settings")
class UserSettings(
    @Id
    var id: Long = SINGLETON_SETTINGS_ID,

    @Column(name = "push_time", nullable = false, length = 5)
    var pushTime: String = "08:00",

    @Column(name = "interest_keywords")
    var interestKeywordsRaw: String? = null,

    @Column(name = "fcm_tokens")
    var fcmTokensRaw: String? = null,

    @Column(name = "watched_stocks")
    var watchedStocksRaw: String? = null,

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),
)

fun UserSettings.interestKeywords(): List<String> = interestKeywordsRaw.toStringList()

fun UserSettings.fcmTokens(): List<String> = fcmTokensRaw.toStringList()

fun UserSettings.watchedStocks(): List<String> = watchedStocksRaw.toStringList()
