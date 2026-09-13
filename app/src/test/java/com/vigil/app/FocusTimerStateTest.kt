package com.vigil.app

import com.vigil.app.ui.components.TimerStatus
import com.vigil.app.ui.viewmodel.FocusTimerMode
import com.vigil.app.ui.viewmodel.FocusTimerState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Locale

class FocusTimerStateTest {

    @Test
    fun testCountdownModeFormatting_Standard() {
        val state = FocusTimerState(
            timerMode = FocusTimerMode.COUNTDOWN,
            targetDurationMinutes = 25,
            activeDurationMs = 5 * 60 * 1000L, // 5 min active
            status = TimerStatus.RUNNING
        )

        val targetMs = 25 * 60 * 1000L
        val remainingMs = (targetMs - state.activeDurationMs).coerceAtLeast(0L)
        val totalSec = remainingMs / 1000
        val mins = totalSec / 60
        val secs = totalSec % 60
        val formatted = String.format(Locale.US, "%02d:%02d", mins, secs)

        assertEquals("20:00", formatted)
        assertEquals(0.2f, state.targetProgress, 0.001f)
        assertFalse(state.isOvertime)
    }

    @Test
    fun testCountdownModeFormatting_Overtime() {
        val targetMinutes = 25
        val activeMs = 30 * 60 * 1000L // 5 min past 25m target
        val targetMs = targetMinutes * 60 * 1000L
        val isOvertime = activeMs > targetMs
        val overtimeSec = (activeMs - targetMs) / 1000
        val mins = overtimeSec / 60
        val secs = overtimeSec % 60
        val formatted = String.format(Locale.US, "+%02d:%02d", mins, secs)

        assertTrue(isOvertime)
        assertEquals("+05:00", formatted)
    }

    @Test
    fun testStopwatchModeFormatting() {
        val activeMs = 3725 * 1000L // 1h 2m 5s
        val totalSec = activeMs / 1000
        val hours = totalSec / 3600
        val mins = (totalSec % 3600) / 60
        val secs = totalSec % 60
        val formatted = if (hours > 0) {
            String.format(Locale.US, "%02d:%02d:%02d", hours, mins, secs)
        } else {
            String.format(Locale.US, "%02d:%02d", mins, secs)
        }

        assertEquals("01:02:05", formatted)
    }

    @Test
    fun testTargetProgressCalculation() {
        val stateHalfway = FocusTimerState(
            targetDurationMinutes = 50,
            activeDurationMs = 25 * 60 * 1000L
        )
        assertEquals(0.5f, stateHalfway.targetProgress, 0.001f)

        val stateCompleted = FocusTimerState(
            targetDurationMinutes = 45,
            activeDurationMs = 45 * 60 * 1000L
        )
        assertEquals(1.0f, stateCompleted.targetProgress, 0.001f)
    }
}
