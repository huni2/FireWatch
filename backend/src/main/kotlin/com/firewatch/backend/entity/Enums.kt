package com.firewatch.backend.entity

// Design Ref: docs/02-design/features/firewatch.design.md §3 — audit_logs.event_type / status
enum class AuditEventType {
    SCHEDULER,
    GEMINI_API,
    FINANCIAL_API,
    FCM_PUSH,
    USER_SETTING,
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
