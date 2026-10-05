package com.firewatch.backend.entity

// Design Ref: docs/02-design/features/firewatch.design.md §3 — audit_logs.event_type / status
enum class AuditEventType {
    SCHEDULER,
    GEMINI_API,
    FINANCIAL_API,
    NEWS_API,
    FCM_PUSH,
    USER_SETTING,
    AUTH,
    GAME,
    ERROR,
    // service 패키지 클래스가 AuditedComponent를 구현하지 않았을 때의 기본값(개발 중 누락을 눈에 띄게 함)
    UNCATEGORIZED,
}

enum class AuditStatus {
    SUCCESS,
    WARNING,
    FALLBACK,
    FAILURE,
}

// briefings.data_source_status — 명세서 5.1절 FALLBACK 상태와 대응
enum class DataSourceStatus {
    NORMAL,
    FALLBACK,
}

// 가상투자 게임(2026-10-05) — game_sessions.status
enum class GameSessionStatus {
    ACTIVE,
    ENDED,
}

// 게임에서 거래 가능한 자산 — 매크로 7종은 그날의 Briefing 스냅샷 필드에서 바로 가격을 구하고,
// STOCK만 symbol이 함께 필요해 StockApiClient로 그 턴 날짜의 실제 종가를 조회한다.
enum class GameInstrumentType {
    GOLD,
    SILVER,
    USD,
    KOSPI,
    KOSDAQ,
    SP500,
    NASDAQ,
    DOW,
    STOCK,
}

enum class GameTradeAction {
    BUY,
    SELL,
}

// 난이도 = 시작 자금(2026-10-05, 사용자 요청) — 금액 자체는 GameService가 매핑("난이도는
// 서버가 정한 의미 있는 단계만 받는다, 클라이언트가 임의 금액을 못 넣게").
enum class GameDifficulty {
    EASY,
    NORMAL,
    HARD,
}
