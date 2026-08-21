package com.firewatch.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

// 설계 문서 원본엔 없던 기능 — 사용자 요청(2026-08-21)으로 추가. Gemini Search Grounding이 무료
// 티어에서 막혀 있어(Next-Tasks.md BE-3 참고) 네이버 뉴스 검색 API로 실제 기사 링크를 제공한다.
// Briefing과 JPA 관계 매핑(@ManyToOne) 대신 평범한 FK 컬럼만 둔다 — 이 프로젝트의 기존 관례
// (감사로그·설정도 전부 평면 엔티티)와 통일.
@Entity
@Table(name = "briefing_news")
class NewsArticle(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "briefing_id", nullable = false)
    var briefingId: Long,

    @Column(name = "title", nullable = false, length = 500)
    var title: String,

    @Column(name = "link", nullable = false, length = 1000)
    var link: String,

    @Column(name = "description", length = 1000)
    var description: String? = null,

    @Column(name = "pub_date")
    var pubDate: Instant? = null,
)
