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

// 2026-10-07: simulationSeed가 있는 새 세션은 완전 가상 게임. null은 과거 자료를 쓴 기존 기록.
// 기기당 활성 세션 1개이며 새 가상 게임 전환 때 기존 세션/거래를 삭제하지 않는다.
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

    // 2026-10-05 사용자 요청 — 시작 시 선택, 게임 중간엔 못 바꿈(trade()가 이 값을 그대로 읽어 매도
    // 시 보유 수량 초과를 허용할지 판단).
    @Column(name = "allow_short_selling", nullable = false)
    var allowShortSelling: Boolean = false,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),

    @Column(name = "ended_at")
    var endedAt: Instant? = null,
    @Column(name = "simulation_seed")
    var simulationSeed: Long? = null,
    // 기존 행은 버전1로 보존한다. 기업/난수 규칙 변경은 새 세션의 버전에서만 적용한다.
    @Column(name = "simulation_version", nullable = false, updatable = false)
    val simulationVersion: Int = 1,
)

fun GameSession.turnDates(): List<LocalDate> = turnDatesRaw.split(",").map { LocalDate.parse(it.trim()) }
