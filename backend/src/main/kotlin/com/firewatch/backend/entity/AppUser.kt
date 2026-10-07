package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

// Design Ref: 공개 배포 전환(2026-09) — 기기별 익명 저장이 기본이고, 사용자가 명시적으로
// "계정 연동"을 눌렀을 때만(AuthService) 생기는 선택적 테이블.
@Entity
@Table(name = "app_users")
class AppUser(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "google_sub", nullable = false, unique = true)
    var googleSub: String,

    @Column(name = "email")
    var email: String? = null,

    @Column(name = "email_verified", nullable = false)
    var emailVerified: Boolean = false,

    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)
