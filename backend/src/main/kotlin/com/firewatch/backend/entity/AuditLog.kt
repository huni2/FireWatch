package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

// Design Ref: §3.1 — audit_logs (명세서 3.2절 스키마 그대로)
@Entity
@Table(name = "audit_logs")
class AuditLog(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    var eventType: AuditEventType,

    @Column(name = "action_name", nullable = false, length = 100)
    var actionName: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    var status: AuditStatus,

    @Column(name = "execution_time_ms")
    var executionTimeMs: Int? = null,

    @Column(name = "request_payload")
    var requestPayload: String? = null,

    @Column(name = "response_summary")
    var responseSummary: String? = null,

    @Column(name = "client_ip", length = 45)
    var clientIp: String? = null,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)
