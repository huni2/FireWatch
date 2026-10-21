// 주기 복구가 시간·대기·예산을 지키며 이미 완료한 작업을 반복하지 않는지 검증한다.
package com.firewatch.backend.service

import com.firewatch.backend.client.GeminiCallBudget
import com.firewatch.backend.entity.Briefing
import com.firewatch.backend.entity.DataSourceStatus
import com.firewatch.backend.repository.BriefingRepository
import com.firewatch.backend.scheduling.BriefingRecoveryScheduler
import io.mockk.*
import org.junit.jupiter.api.Test
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class BriefingRecoverySchedulerTest {
    private val scheduler = mockk<SchedulerJob>(relaxed = true)
    private val reports = mockk<RecommendationReportService>(relaxed = true)
    private val briefings = mockk<BriefingRepository>()
    private val jdbc = mockk<JdbcTemplate>()
    private val budget = mockk<GeminiCallBudget>()
    private val now = Instant.parse("2026-10-21T00:00:00Z")
    private val today = now.atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDate()
    private fun driver(at: Instant = now) = BriefingRecoveryScheduler(scheduler, reports, briefings, jdbc, budget,
        "07:00", "Asia/Seoul", Clock.fixed(at, ZoneOffset.UTC))

    @Test fun `한국 7시 전에는 저장소나 제공처에 접근하지 않는다`() {
        driver(Instant.parse("2026-10-20T21:59:00Z")).recoverIfDue()
        verify { listOf(scheduler, reports, briefings, jdbc, budget) wasNot Called }
    }

    @Test fun `실행 시각이 되면 기존 작업으로 복구한 뒤 새 분석 없이 결과를 보관한다`() {
        var current: Briefing? = null
        every { briefings.findByBriefingDate(today) } answers { current }
        every { budget.exhausted(now) } returns false
        every { jdbc.queryForObject(any<String>(), Int::class.java, any(), any(), any()) } returns 0
        every { jdbc.queryForObject(any<String>(), Int::class.java, today) } returns 0
        every { scheduler.runMorningBriefing() } answers { current = Briefing(briefingDate = today, marketSummary = "복구", dataSourceStatus = DataSourceStatus.NORMAL) }
        driver().recoverIfDue()
        verify(exactly = 1) { scheduler.runMorningBriefing() }
        verify(exactly = 1) { reports.collectIfDue(now) }
    }

    @Test fun `이미 정상 브리핑과 보고서가 있으면 작업 호출도 추가 감사로그도 만들지 않는다`() {
        every { briefings.findByBriefingDate(today) } returns Briefing(briefingDate = today, marketSummary = "정상", dataSourceStatus = DataSourceStatus.NORMAL)
        every { jdbc.queryForObject(any<String>(), Int::class.java, today) } returns 1
        driver().recoverIfDue()
        verify { listOf(scheduler, reports, budget) wasNot Called }
    }

    @Test fun `일별 예산이 끝난 FALLBACK은 다시 호출하지 않는다`() {
        every { briefings.findByBriefingDate(today) } returns Briefing(briefingDate = today, marketSummary = "기본", dataSourceStatus = DataSourceStatus.FALLBACK)
        every { budget.exhausted(now) } returns true
        driver().recoverIfDue()
        verify { listOf(scheduler, reports, jdbc) wasNot Called }
    }

    @Test fun `다음 시각이나 기존 임대가 남으면 작업을 실행하지 않는다`() {
        every { briefings.findByBriefingDate(today) } returns null
        every { budget.exhausted(now) } returns false
        every { jdbc.queryForObject(any<String>(), Int::class.java, any(), any(), any()) } returns 1
        driver().recoverIfDue()
        verify { listOf(scheduler, reports) wasNot Called }
    }

    @Test fun `실제 Spring 구성에서 선택적 Clock 없이도 복구 빈을 생성한다`() {
        org.springframework.context.annotation.AnnotationConfigApplicationContext().use { context ->
            context.environment.propertySources.addFirst(org.springframework.core.env.MapPropertySource("test", mapOf(
                "firewatch.scheduler.generate-after" to "07:00", "firewatch.scheduler.timezone" to "Asia/Seoul", "firewatch.scheduler.recovery-enabled" to "true")))
            mapOf("scheduler" to scheduler, "reports" to reports, "briefings" to briefings, "jdbc" to jdbc, "budget" to budget)
                .forEach { (name, bean) -> context.beanFactory.registerSingleton(name, bean) }
            context.register(BriefingRecoveryScheduler::class.java)
            context.refresh()
            kotlin.test.assertNotNull(context.getBean(BriefingRecoveryScheduler::class.java))
        }
    }
}
