package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

// Design Ref: 가상투자 게임(2026-10-05) — 실제로 쌓인 Briefing 날짜들을 셔플해 턴 순서로 삼는다(한
// 세션의 턴 하나 = 실제 있었던 어느 날의 뉴스·지표·AI추천종목 세트). 기기당 활성 세션 1개만 허용 —
// Settings와 동일하게 X-Device-Id로만 식별, 별도 로그인 없음.
@Entity
@Table(name = "game_sessions")
class GameSession(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "device_id", nullable = false)
    var deviceId: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    var status: GameSessionStatus = GameSessionStatus.ACTIVE,

    // 셔플된 briefing_date들을 쉼표 구분 문자열로 저장 — recommended_stocks 저장 관례(TextListConverter)와 동일.
    @Column(name = "turn_dates", nullable = false, length = 2000)
    var turnDatesRaw: String,

    @Column(name = "current_turn_index", nullable = false)
    var currentTurnIndex: Int = 0,

    @Column(name = "starting_cash", nullable = false)
    var startingCash: BigDecimal,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),

    @Column(name = "ended_at")
    var endedAt: Instant? = null,
)

fun GameSession.turnDates(): List<LocalDate> = turnDatesRaw.split(",").map { LocalDate.parse(it.trim()) }
