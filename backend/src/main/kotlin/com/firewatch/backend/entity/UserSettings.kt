package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import kotlin.random.Random

// Design Ref: 공개 배포 전환(2026-09) — 기기별 익명 저장이 기본, Google 계정 연동은 선택.
// id에 DB auto-increment를 안 쓰는 이유: 기존 프로덕션에 이미 id=1(소유자, 레거시 싱글톤) 행이 수동
// PK로 들어가 있어 지금 와서 시퀀스/IDENTITY로 바꾸려면 위험한 ALTER COLUMN이 필요하다 — 대신 신규 행은
// 이 랜덤 id로 생성한다(63비트 공간이라 이 프로젝트 규모에서 충돌 위험은 무시할 수준).
private fun randomSettingsId(): Long = Random.nextLong(1000L, Long.MAX_VALUE)

@Entity
@Table(name = "user_settings")
class UserSettings(
    @Id
    var id: Long = randomSettingsId(),

    // 기기 하나가 이 행을 단독으로 쓰면(익명) 채워짐. Google 계정에 연동되면 null로 비워지고
    // device_links 테이블이 "어느 기기가 이 행을 쓰는지"를 대신 관리한다(SettingsIdentityService 참고).
    @Column(name = "device_id", unique = true)
    var deviceId: String? = null,

    // Google 계정에 연동된 행이면 채워짐 — 여러 기기가 device_links를 통해 이 하나의 행을 공유한다.
    @Column(name = "user_id")
    var userId: Long? = null,

    @Column(name = "push_time", nullable = false, length = 5)
    var pushTime: String = "08:00",

    @Column(name = "interest_keywords")
    var interestKeywordsRaw: String? = null,

    @Column(name = "fcm_tokens")
    var fcmTokensRaw: String? = null,

    @Column(name = "watched_stocks")
    var watchedStocksRaw: String? = null,

    @Column(name = "web_push_subscriptions")
    var webPushSubscriptionsRaw: String? = null,

    // 여러 사용자가 각자 다른 pushTime을 갖게 되면서(공개 배포 전환) "오늘자 브리핑 존재 여부"만으로는
    // "이 행에 오늘 이미 보냈는지"를 알 수 없어졌다 — PushService가 행마다 직접 이 값으로 판정·기록한다.
    @Column(name = "last_notified_date")
    var lastNotifiedDate: LocalDate? = null,

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),
)

fun UserSettings.interestKeywords(): List<String> = interestKeywordsRaw.toStringList()

fun UserSettings.fcmTokens(): List<String> = fcmTokensRaw.toStringList()

fun UserSettings.watchedStocks(): List<String> = watchedStocksRaw.toStringList()

fun UserSettings.webPushSubscriptions(): List<WebPushSubscription> = webPushSubscriptionsRaw.toWebPushSubscriptions()
