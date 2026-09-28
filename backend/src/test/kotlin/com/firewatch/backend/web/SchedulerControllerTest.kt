package com.firewatch.backend.web

import com.firewatch.backend.entity.UserSettings
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.LocalTime
import kotlin.test.assertFalse
import kotlin.test.assertTrue

// Design Ref: docs/02-design/features/mobile-app.design.md — pushTime을 실제로 반영하는 폴링 판정.
// FinancialApiClientTest와 동일 관례로 순수 함수만 검증(벽시계·DB 없음).
class SchedulerControllerTest {

    @Test
    fun `pushTime 직후면 due다`() {
        assertTrue(SchedulerController.isDue("08:00", LocalTime.of(8, 5), windowMinutes = 20))
    }

    @Test
    fun `pushTime 정각도 due다`() {
        assertTrue(SchedulerController.isDue("08:00", LocalTime.of(8, 0), windowMinutes = 20))
    }

    @Test
    fun `pushTime 전이면 due가 아니다`() {
        assertFalse(SchedulerController.isDue("08:00", LocalTime.of(7, 55), windowMinutes = 20))
    }

    @Test
    fun `윈도우를 넘어서면 due가 아니다`() {
        assertFalse(SchedulerController.isDue("08:00", LocalTime.of(8, 25), windowMinutes = 20))
    }

    @Test
    fun `자정을 넘나드는 pushTime도 정상 판정한다`() {
        assertTrue(SchedulerController.isDue("23:55", LocalTime.of(0, 5), windowMinutes = 20))
        assertFalse(SchedulerController.isDue("23:55", LocalTime.of(0, 20), windowMinutes = 20))
    }

    // 공개 배포 전환(2026-09) — 사용자마다 pushTime이 다를 수 있어 행 단위로 판정하는 isRowDue.
    @Test
    fun `오늘 이미 보낸 행은 due가 아니다`() {
        val row = UserSettings(pushTime = "08:00").apply { lastNotifiedDate = LocalDate.of(2026, 1, 1) }
        assertFalse(SchedulerController.isRowDue(row, LocalTime.of(8, 5), windowMinutes = 20, today = LocalDate.of(2026, 1, 1)))
    }

    @Test
    fun `창을 넘겨서 아직 못 보낸 행은 그날 안이면 여전히 due다`() {
        val row = UserSettings(pushTime = "08:00")
        assertTrue(SchedulerController.isRowDue(row, LocalTime.of(14, 0), windowMinutes = 20, today = LocalDate.of(2026, 1, 1)))
    }

    @Test
    fun `pushTime 전이고 아직 안 보냈으면 due가 아니다`() {
        val row = UserSettings(pushTime = "08:00")
        assertFalse(SchedulerController.isRowDue(row, LocalTime.of(7, 0), windowMinutes = 20, today = LocalDate.of(2026, 1, 1)))
    }
}
