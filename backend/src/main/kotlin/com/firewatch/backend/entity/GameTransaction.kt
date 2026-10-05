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

// Design Ref: 가상투자 게임(2026-10-05) — 보유 수량·현금은 별도 컬럼으로 안 두고, 이 테이블을
// 현재 턴까지 재생해서 매번 계산한다(GameService 참고) — 세션당 턴·거래 수가 적어 동기화 버그
// 위험을 없애는 쪽을 택함.
@Entity
@Table(name = "game_transactions")
class GameTransaction(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "session_id", nullable = false)
    var sessionId: Long,

    @Column(name = "turn_index", nullable = false)
    var turnIndex: Int,

    @Enumerated(EnumType.STRING)
    @Column(name = "instrument_type", nullable = false, length = 20)
    var instrumentType: GameInstrumentType,

    // STOCK일 때만 채워짐
    @Column(name = "symbol")
    var symbol: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 10)
    var action: GameTradeAction,

    @Column(name = "quantity", nullable = false)
    var quantity: BigDecimal,

    @Column(name = "price", nullable = false)
    var price: BigDecimal,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)
