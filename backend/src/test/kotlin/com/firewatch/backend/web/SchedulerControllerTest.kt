package com.firewatch.backend.web

import org.junit.jupiter.api.Test
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
}
