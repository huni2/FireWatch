package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

// Design Ref: 공개 배포 전환(2026-09) — 어느 기기가 어느 AppUser에 연동돼 있는지. deviceId 자체가
// PK라 기기 하나는 최대 한 계정에만 연동된다(같은 계정에 여러 기기가 연동되는 건 허용 — 그게 동기화 목적).
@Entity
@Table(name = "device_links")
class DeviceLink(
    @Id
    @Column(name = "device_id")
    var deviceId: String,

    @Column(name = "user_id", nullable = false)
    var userId: Long,

    @Column(name = "linked_at")
    var linkedAt: Instant = Instant.now(),
)
