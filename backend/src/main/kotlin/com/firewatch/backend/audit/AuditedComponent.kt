package com.firewatch.backend.audit

import com.firewatch.backend.entity.AuditEventType

/**
 * Design Ref: §1.2/§2.0 — 감사로그는 옵트인이 아니라 옵트아웃이다.
 * `service` 패키지의 모든 공개 메서드는 [AuditLogAspect]가 기본으로 가로챈다.
 * 이 인터페이스는 "감사로그를 켤지"가 아니라 "어느 event_type으로 분류할지"만 결정한다 —
 * 구현하지 않아도 로그는 남되, event_type이 "UNCATEGORIZED"로 기록된다(개발 중 눈에 띄게 하기 위함).
 */
interface AuditedComponent {
    val auditEventType: AuditEventType
}
