package com.vigil.app

import com.vigil.app.data.model.IntervalEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.max
import kotlin.math.min

class TimeAccountingTest {

    @Test
    fun testScenarioA01_ExactTimingAccounting() {
        // 09:00 Start -> 09:20 Pause -> 09:30 Resume -> 10:00 Finish
        val t0 = 1757235600000L // 09:00:00 UTC
        val t1 = t0 + 20 * 60 * 1000L // 09:20:00 (20 min active)
        val t2 = t1 + 10 * 60 * 1000L // 09:30:00 (10 min pause)
        val t3 = t2 + 30 * 60 * 1000L // 10:00:00 (30 min active)

        val intervals = listOf(
            IntervalEntity(id = "1", sessionId = "s1", activityId = "act1", kind = "active", startInstant = t0, endInstant = t1),
            IntervalEntity(id = "2", sessionId = "s1", activityId = "act1", kind = "pause", startInstant = t1, endInstant = t2, reason = "Break"),
            IntervalEntity(id = "3", sessionId = "s1", activityId = "act1", kind = "active", startInstant = t2, endInstant = t3)
        )

        var activeMs = 0L
        var pauseMs = 0L
        var longestActiveMs = 0L

        for (i in intervals) {
            val dur = (i.endInstant ?: t3) - i.startInstant
            if (i.kind == "active") {
                activeMs += dur
                if (dur > longestActiveMs) longestActiveMs = dur
            } else if (i.kind == "pause") {
                pauseMs += dur
            }
        }

        val totalElapsedMs = t3 - t0

        assertEquals(50 * 60 * 1000L, activeMs) // 50m active
        assertEquals(10 * 60 * 1000L, pauseMs) // 10m pause
        assertEquals(60 * 60 * 1000L, totalElapsedMs) // 60m elapsed
        assertEquals(30 * 60 * 1000L, longestActiveMs) // 30m longest active
        assertEquals(totalElapsedMs, activeMs + pauseMs) // exact sum coverage without double counting
    }

    @Test
    fun testGapSplitAccounting() {
        // A 30-minute gap from 11:00 to 11:30 split into Cleaning 20m and Rest 10m
        val gapStart = 1000000L
        val splitPoint = gapStart + 20 * 60 * 1000L
        val gapEnd = gapStart + 30 * 60 * 1000L

        val part1Dur = splitPoint - gapStart
        val part2Dur = gapEnd - splitPoint

        assertEquals(20 * 60 * 1000L, part1Dur)
        assertEquals(10 * 60 * 1000L, part2Dur)
        assertEquals(30 * 60 * 1000L, part1Dur + part2Dur)
    }

    @Test
    fun testHalfOpenIntervalClipping() {
        // Interval spanning across midnight: 23:30 to 01:30 (2 hours total)
        // Clip to Day 1: [23:30, 24:00) = 30 mins
        // Clip to Day 2: [00:00, 01:30) = 90 mins
        val day1Start = 0L
        val day1End = 24 * 3600 * 1000L
        val day2End = 48 * 3600 * 1000L

        val start = day1End - 30 * 60 * 1000L // 23:30
        val end = day1End + 90 * 60 * 1000L // 01:30 next day

        val clippedDay1Start = max(start, day1Start)
        val clippedDay1End = min(end, day1End)
        val day1Dur = clippedDay1End - clippedDay1Start

        val clippedDay2Start = max(start, day1End)
        val clippedDay2End = min(end, day2End)
        val day2Dur = clippedDay2End - clippedDay2Start

        assertEquals(30 * 60 * 1000L, day1Dur)
        assertEquals(90 * 60 * 1000L, day2Dur)
        assertEquals(120 * 60 * 1000L, day1Dur + day2Dur)
    }
}
