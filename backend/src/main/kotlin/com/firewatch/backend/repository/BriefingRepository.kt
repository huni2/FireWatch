package com.firewatch.backend.repository

import com.firewatch.backend.entity.Briefing
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface BriefingRepository : JpaRepository<Briefing, Long> {
    fun findByBriefingDate(briefingDate: LocalDate): Briefing?
    fun findByBriefingDateBetweenOrderByBriefingDateDesc(from: LocalDate, to: LocalDate): List<Briefing>
    fun findTopByOrderByBriefingDateDesc(): Briefing?
}
