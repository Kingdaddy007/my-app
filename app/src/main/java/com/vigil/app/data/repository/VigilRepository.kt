package com.vigil.app.data.repository

import androidx.room.withTransaction
import com.vigil.app.data.AppDatabase
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.data.model.CategoryEntity
import com.vigil.app.data.model.IntervalEntity
import com.vigil.app.data.model.PriorityEntity
import com.vigil.app.data.model.SessionEntity
import com.vigil.app.data.model.SettingsEntity
import com.vigil.app.data.model.WakeMarkerEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

data class LiveSessionState(
    val session: SessionEntity?,
    val activity: ActivityEntity?,
    val category: CategoryEntity?,
    val activeIntervals: List<IntervalEntity>,
    val activeDurationMs: Long,
    val pauseDurationMs: Long,
    val totalElapsedMs: Long,
    val currentInterval: IntervalEntity?
)

sealed class TimelineBlock {
    data class Recorded(
        val interval: IntervalEntity,
        val activity: ActivityEntity?,
        val category: CategoryEntity?,
        val displayStartMs: Long,
        val displayEndMs: Long,
        val displayDurationMs: Long
    ) : TimelineBlock()

    data class Gap(
        val startMs: Long,
        val endMs: Long,
        val durationMs: Long
    ) : TimelineBlock()
}

data class DaySummary(
    val date: LocalDate,
    val blocks: List<TimelineBlock>,
    val totalActiveMs: Long,
    val totalPauseMs: Long,
    val totalSleepMs: Long,
    val totalUntrackedMs: Long,
    val dayElapsedMs: Long,
    val wakeInstant: Long?
)

data class CategoryBreakdown(
    val category: CategoryEntity,
    val durationMs: Long,
    val percentage: Float
)

data class ReviewStats(
    val dateRangeText: String,
    val totalRecordedMs: Long,
    val totalPauseMs: Long,
    val totalUntrackedMs: Long,
    val categoryBreakdowns: List<CategoryBreakdown>,
    val longestUninterruptedMs: Long,
    val interruptionCount: Int,
    val averageSessionMs: Long,
    val daysWithDataCount: Int
)

class VigilRepository(private val db: AppDatabase) {

    private val categoryDao = db.categoryDao()
    private val activityDao = db.activityDao()
    private val sessionDao = db.sessionDao()
    private val intervalDao = db.intervalDao()
    private val wakeMarkerDao = db.wakeMarkerDao()
    private val priorityDao = db.priorityDao()
    private val settingsDao = db.settingsDao()

    // Flows for UI observation
    fun getSettings(): Flow<SettingsEntity?> = settingsDao.getSettings()
    fun getCategories(): Flow<List<CategoryEntity>> = categoryDao.getAllCategories()
    fun getActiveActivities(): Flow<List<ActivityEntity>> = activityDao.getActiveActivities()
    fun getAllActivities(): Flow<List<ActivityEntity>> = activityDao.getAllActivities()
    fun getLiveSession(): Flow<SessionEntity?> = sessionDao.getLiveSession()
    fun getPriorities(localDate: String): Flow<List<PriorityEntity>> = priorityDao.getPrioritiesForDate(localDate)
    fun getWakeMarker(date: String): Flow<WakeMarkerEntity?> = wakeMarkerDao.getWakeMarkerForDate(date)

    suspend fun getSettingsImmediate(): SettingsEntity {
        return settingsDao.getSettingsImmediate() ?: run {
            val defaultSettings = SettingsEntity()
            settingsDao.insertSettings(defaultSettings)
            defaultSettings
        }
    }

    suspend fun updateSettings(settings: SettingsEntity) {
        settingsDao.updateSettings(settings)
    }

    suspend fun initializeDefaultsIfNeeded(displayName: String = "") {
        val existingCategories = categoryDao.getAllCategoriesList()
        if (existingCategories.isEmpty()) {
            val defaultCategories = listOf(
                CategoryEntity(id = "cat_spiritual", name = "Spiritual", colorHex = "#818CF8", iconKey = "spiritual", sortOrder = 0),
                CategoryEntity(id = "cat_focus", name = "Focus", colorHex = "#34D399", iconKey = "focus", sortOrder = 1),
                CategoryEntity(id = "cat_trading", name = "Trading", colorHex = "#FBBF24", iconKey = "trading", sortOrder = 2),
                CategoryEntity(id = "cat_physical", name = "Physical", colorHex = "#FB7185", iconKey = "physical", sortOrder = 3),
                CategoryEntity(id = "cat_maintenance", name = "Maintenance", colorHex = "#2DD4BF", iconKey = "cleaning", sortOrder = 4),
                CategoryEntity(id = "cat_recharge", name = "Recharge", colorHex = "#38BDF8", iconKey = "rest", sortOrder = 5),
                CategoryEntity(id = "cat_sleep", name = "Sleep", colorHex = "#94A3B8", iconKey = "sleep", sortOrder = 6)
            )
            categoryDao.insertCategories(defaultCategories)

            val defaultActivities = listOf(
                ActivityEntity(id = "act_prayer", name = "Prayer", categoryId = "cat_spiritual", iconKey = "prayer", isFavorite = true),
                ActivityEntity(id = "act_study", name = "Study", categoryId = "cat_focus", iconKey = "book", isFavorite = true),
                ActivityEntity(id = "act_trading", name = "Trading", categoryId = "cat_trading", iconKey = "trending", isFavorite = true),
                ActivityEntity(id = "act_work", name = "Work", categoryId = "cat_focus", iconKey = "work", isFavorite = true),
                ActivityEntity(id = "act_cleaning", name = "Cleaning", categoryId = "cat_maintenance", iconKey = "cleaning", isFavorite = false),
                ActivityEntity(id = "act_exercise", name = "Exercise", categoryId = "cat_physical", iconKey = "exercise", isFavorite = true),
                ActivityEntity(id = "act_rest", name = "Rest", categoryId = "cat_recharge", iconKey = "rest", isFavorite = false),
                ActivityEntity(id = "act_sleep", name = "Sleep", categoryId = "cat_sleep", iconKey = "sleep", isFavorite = false)
            )
            activityDao.insertActivities(defaultActivities)
        }

        val settings = settingsDao.getSettingsImmediate()
        if (settings == null) {
            settingsDao.insertSettings(SettingsEntity(displayName = displayName, hasCompletedOnboarding = true))
        } else if (displayName.isNotBlank() && settings.displayName.isBlank()) {
            settingsDao.updateSettings(settings.copy(displayName = displayName, hasCompletedOnboarding = true))
        }
    }

    // --- TIMING ENGINE & ATOMIC STATE MACHINE ---

    suspend fun startSession(
        activityId: String,
        targetSeconds: Long? = null,
        timestamp: Long = System.currentTimeMillis()
    ): Result<SessionEntity> = db.withTransaction {
        // Enforce single running or paused session
        val currentLive = sessionDao.getLiveSessionImmediate()
        if (currentLive != null) {
            return@withTransaction Result.failure(IllegalStateException("A session is already active: ${currentLive.id}"))
        }

        // Validate activity exists
        val activity = activityDao.getActivityById(activityId)
            ?: return@withTransaction Result.failure(IllegalArgumentException("Activity $activityId does not exist"))

        val sessionId = UUID.randomUUID().toString()
        val session = SessionEntity(
            id = sessionId,
            activityId = activityId,
            status = "running",
            startedAt = timestamp,
            targetSeconds = targetSeconds ?: activity.targetSeconds,
            createdAt = timestamp,
            updatedAt = timestamp
        )
        sessionDao.insertSession(session)

        val interval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = sessionId,
            activityId = activityId,
            kind = "active",
            startInstant = timestamp,
            endInstant = null
        )
        intervalDao.insertInterval(interval)

        Result.success(session)
    }

    suspend fun pauseSession(
        timestamp: Long = System.currentTimeMillis(),
        reason: String? = null
    ): Result<Unit> = db.withTransaction {
        val currentLive = sessionDao.getLiveSessionImmediate()
            ?: return@withTransaction Result.failure(IllegalStateException("No active session to pause"))

        if (currentLive.status != "running") {
            return@withTransaction Result.failure(IllegalStateException("Session is not running (status: ${currentLive.status})"))
        }

        // Close currently open active interval
        val openInterval = intervalDao.getOpenInterval()
        if (openInterval != null) {
            val safeEnd = max(openInterval.startInstant, timestamp)
            intervalDao.updateInterval(openInterval.copy(endInstant = safeEnd))
        }

        // Open pause interval
        val pauseInterval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = currentLive.id,
            activityId = currentLive.activityId,
            kind = "pause",
            startInstant = timestamp,
            endInstant = null,
            reason = reason
        )
        intervalDao.insertInterval(pauseInterval)

        sessionDao.updateSession(currentLive.copy(status = "paused", updatedAt = timestamp))
        Result.success(Unit)
    }

    suspend fun updatePauseReason(reason: String): Result<Unit> = db.withTransaction {
        val openInterval = intervalDao.getOpenInterval()
        if (openInterval != null && openInterval.kind == "pause") {
            intervalDao.updateInterval(openInterval.copy(reason = reason))
            Result.success(Unit)
        } else {
            Result.failure(IllegalStateException("No open pause interval to update"))
        }
    }

    suspend fun resumeSession(
        timestamp: Long = System.currentTimeMillis()
    ): Result<Unit> = db.withTransaction {
        val currentLive = sessionDao.getLiveSessionImmediate()
            ?: return@withTransaction Result.failure(IllegalStateException("No active session to resume"))

        if (currentLive.status != "paused") {
            return@withTransaction Result.failure(IllegalStateException("Session is not paused (status: ${currentLive.status})"))
        }

        // Close currently open pause interval
        val openInterval = intervalDao.getOpenInterval()
        if (openInterval != null) {
            val safeEnd = max(openInterval.startInstant, timestamp)
            intervalDao.updateInterval(openInterval.copy(endInstant = safeEnd))
        }

        // Open new active interval
        val activeInterval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = currentLive.id,
            activityId = currentLive.activityId,
            kind = "active",
            startInstant = timestamp,
            endInstant = null
        )
        intervalDao.insertInterval(activeInterval)

        sessionDao.updateSession(currentLive.copy(status = "running", updatedAt = timestamp))
        Result.success(Unit)
    }

    suspend fun finishSession(
        timestamp: Long = System.currentTimeMillis()
    ): Result<SessionEntity> = db.withTransaction {
        val currentLive = sessionDao.getLiveSessionImmediate()
            ?: return@withTransaction Result.failure(IllegalStateException("No active session to finish"))

        // Close any open interval
        val openInterval = intervalDao.getOpenInterval()
        if (openInterval != null) {
            val safeEnd = max(openInterval.startInstant, timestamp)
            intervalDao.updateInterval(openInterval.copy(endInstant = safeEnd))
        }

        val safeEnd = max(currentLive.startedAt, timestamp)
        val completedSession = currentLive.copy(
            status = "completed",
            endedAt = safeEnd,
            updatedAt = timestamp
        )
        sessionDao.updateSession(completedSession)
        Result.success(completedSession)
    }

    suspend fun switchSession(
        newActivityId: String,
        timestamp: Long = System.currentTimeMillis()
    ): Result<SessionEntity> = db.withTransaction {
        val currentLive = sessionDao.getLiveSessionImmediate()
        if (currentLive != null) {
            // Close previous session
            val openInterval = intervalDao.getOpenInterval()
            if (openInterval != null) {
                val safeEnd = max(openInterval.startInstant, timestamp)
                intervalDao.updateInterval(openInterval.copy(endInstant = safeEnd))
            }
            sessionDao.updateSession(currentLive.copy(status = "completed", endedAt = timestamp, updatedAt = timestamp))
        }

        // Start new session
        val activity = activityDao.getActivityById(newActivityId)
            ?: return@withTransaction Result.failure(IllegalArgumentException("Activity not found"))

        val newSessionId = UUID.randomUUID().toString()
        val newSession = SessionEntity(
            id = newSessionId,
            activityId = newActivityId,
            status = "running",
            startedAt = timestamp,
            targetSeconds = activity.targetSeconds,
            createdAt = timestamp,
            updatedAt = timestamp
        )
        sessionDao.insertSession(newSession)

        val newInterval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = newSessionId,
            activityId = newActivityId,
            kind = "active",
            startInstant = timestamp,
            endInstant = null
        )
        intervalDao.insertInterval(newInterval)

        Result.success(newSession)
    }

    // --- ACCURATE REVENUE & TIMELINE DERIVATIONS ---

    suspend fun computeCurrentLiveState(now: Long = System.currentTimeMillis()): LiveSessionState {
        val session = sessionDao.getLiveSessionImmediate()
        if (session == null) {
            return LiveSessionState(null, null, null, emptyList(), 0, 0, 0, null)
        }

        val activity = activityDao.getActivityById(session.activityId)
        val category = activity?.let { categoryDao.getCategoryById(it.categoryId) }
        val intervals = intervalDao.getIntervalsForSessionImmediate(session.id)

        var activeMs = 0L
        var pauseMs = 0L
        var openInterval: IntervalEntity? = null

        for (interval in intervals) {
            val end = interval.endInstant ?: now
            val duration = max(0L, end - interval.startInstant)
            if (interval.kind == "active" || interval.kind == "manual") {
                activeMs += duration
            } else if (interval.kind == "pause") {
                pauseMs += duration
            }
            if (interval.endInstant == null) {
                openInterval = interval
            }
        }

        val totalElapsed = max(0L, now - session.startedAt)
        return LiveSessionState(
            session = session,
            activity = activity,
            category = category,
            activeIntervals = intervals,
            activeDurationMs = activeMs,
            pauseDurationMs = pauseMs,
            totalElapsedMs = totalElapsed,
            currentInterval = openInterval
        )
    }

    suspend fun getDaySummary(
        date: LocalDate,
        zoneId: ZoneId = ZoneId.systemDefault(),
        now: Long = System.currentTimeMillis()
    ): DaySummary {
        val startOfDay = date.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val endOfDay = date.plusDays(1).atStartOfDay(zoneId).toInstant().toEpochMilli()
        val isToday = date == LocalDate.now(zoneId)
        val effectiveRangeEnd = if (isToday) min(now, endOfDay) else endOfDay

        val rawIntervals = intervalDao.getIntervalsInRangeImmediate(startOfDay, endOfDay)
        val activities = activityDao.getAllActivitiesList().associateBy { it.id }
        val categories = categoryDao.getAllCategoriesList().associateBy { it.id }
        val wakeMarker = wakeMarkerDao.getWakeMarkerForDateImmediate(date.toString())

        // Clip intervals to [startOfDay, effectiveRangeEnd)
        val clippedBlocks = mutableListOf<TimelineBlock>()
        var lastAccountedEnd = startOfDay

        // Sort by start instant
        val sortedIntervals = rawIntervals.sortedBy { it.startInstant }

        var totalActive = 0L
        var totalPause = 0L
        var totalSleep = 0L

        for (interval in sortedIntervals) {
            val origEnd = interval.endInstant ?: effectiveRangeEnd
            val clippedStart = max(interval.startInstant, startOfDay)
            val clippedEnd = min(origEnd, effectiveRangeEnd)

            if (clippedEnd <= clippedStart) continue

            // Detect gap before this interval
            if (clippedStart > lastAccountedEnd) {
                val gapDuration = clippedStart - lastAccountedEnd
                if (gapDuration >= 60_000L) { // Only gaps of 1 minute or more
                    clippedBlocks.add(
                        TimelineBlock.Gap(
                            startMs = lastAccountedEnd,
                            endMs = clippedStart,
                            durationMs = gapDuration
                        )
                    )
                }
            }

            val act = interval.activityId?.let { activities[it] }
            val cat = act?.let { categories[it.categoryId] }
            val duration = clippedEnd - clippedStart

            when (interval.kind) {
                "active", "manual" -> totalActive += duration
                "pause" -> totalPause += duration
                "sleep" -> totalSleep += duration
            }

            clippedBlocks.add(
                TimelineBlock.Recorded(
                    interval = interval,
                    activity = act,
                    category = cat,
                    displayStartMs = clippedStart,
                    displayEndMs = clippedEnd,
                    displayDurationMs = duration
                )
            )

            lastAccountedEnd = max(lastAccountedEnd, clippedEnd)
        }

        // Check trailing gap if elapsed
        if (effectiveRangeEnd > lastAccountedEnd) {
            val trailingGap = effectiveRangeEnd - lastAccountedEnd
            if (trailingGap >= 60_000L) {
                clippedBlocks.add(
                    TimelineBlock.Gap(
                        startMs = lastAccountedEnd,
                        endMs = effectiveRangeEnd,
                        durationMs = trailingGap
                    )
                )
            }
        }

        val dayElapsed = max(0L, effectiveRangeEnd - startOfDay)
        val totalUntracked = max(0L, dayElapsed - (totalActive + totalPause + totalSleep))

        return DaySummary(
            date = date,
            blocks = clippedBlocks,
            totalActiveMs = totalActive,
            totalPauseMs = totalPause,
            totalSleepMs = totalSleep,
            totalUntrackedMs = totalUntracked,
            dayElapsedMs = dayElapsed,
            wakeInstant = wakeMarker?.wakeInstant
        )
    }

    suspend fun getReviewStats(
        startDate: LocalDate,
        endDate: LocalDate,
        zoneId: ZoneId = ZoneId.systemDefault()
    ): ReviewStats {
        val startMs = startDate.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val endMs = endDate.plusDays(1).atStartOfDay(zoneId).toInstant().toEpochMilli()

        val intervals = intervalDao.getIntervalsInRangeImmediate(startMs, endMs)
        val activities = activityDao.getAllActivitiesList().associateBy { it.id }
        val categories = categoryDao.getAllCategoriesList().associateBy { it.id }

        val categoryTimeMap = mutableMapOf<String, Long>()
        var totalRecorded = 0L
        var totalPause = 0L
        var longestUninterrupted = 0L
        var pauseCount = 0
        var sessionCount = 0

        for (interval in intervals) {
            val end = interval.endInstant ?: System.currentTimeMillis()
            val duration = max(0L, min(end, endMs) - max(interval.startInstant, startMs))

            if (interval.kind == "active" || interval.kind == "manual") {
                totalRecorded += duration
                sessionCount++
                if (duration > longestUninterrupted) {
                    longestUninterrupted = duration
                }
                val act = interval.activityId?.let { activities[it] }
                if (act != null) {
                    val catId = act.categoryId
                    categoryTimeMap[catId] = (categoryTimeMap[catId] ?: 0L) + duration
                }
            } else if (interval.kind == "pause") {
                totalPause += duration
                pauseCount++
            } else if (interval.kind == "sleep") {
                totalRecorded += duration
                categoryTimeMap["cat_sleep"] = (categoryTimeMap["cat_sleep"] ?: 0L) + duration
            }
        }

        val totalCategoryTime = categoryTimeMap.values.sum()
        val categoryBreakdowns = categories.values.mapNotNull { cat ->
            val duration = categoryTimeMap[cat.id] ?: 0L
            if (duration > 0) {
                CategoryBreakdown(
                    category = cat,
                    durationMs = duration,
                    percentage = if (totalCategoryTime > 0) duration.toFloat() / totalCategoryTime else 0f
                )
            } else null
        }.sortedByDescending { it.durationMs }

        val averageSession = if (sessionCount > 0) totalRecorded / sessionCount else 0L

        val rangeText = if (startDate == endDate) {
            "${startDate.month.name.take(3)} ${startDate.dayOfMonth}, ${startDate.year}"
        } else {
            "${startDate.month.name.take(3)} ${startDate.dayOfMonth} – ${endDate.month.name.take(3)} ${endDate.dayOfMonth}"
        }

        val daysWithData = (intervals.map {
            Instant.ofEpochMilli(it.startInstant).atZone(zoneId).toLocalDate()
        }.distinct()).size

        return ReviewStats(
            dateRangeText = rangeText,
            totalRecordedMs = totalRecorded,
            totalPauseMs = totalPause,
            totalUntrackedMs = 0L, // Derived per day
            categoryBreakdowns = categoryBreakdowns,
            longestUninterruptedMs = longestUninterrupted,
            interruptionCount = pauseCount,
            averageSessionMs = averageSession,
            daysWithDataCount = max(1, daysWithData)
        )
    }

    // --- GAP MANAGEMENT & CORRECTIONS ---

    suspend fun labelGap(
        startInstant: Long,
        endInstant: Long,
        activityId: String
    ): Result<IntervalEntity> = db.withTransaction {
        if (endInstant <= startInstant) {
            return@withTransaction Result.failure(IllegalArgumentException("End instant must be after start instant"))
        }

        // Collision check: verify no overlapping accounted intervals exist in [startInstant, endInstant)
        val collisions = intervalDao.getIntervalsInRangeImmediate(startInstant, endInstant).filter {
            val end = it.endInstant ?: Long.MAX_VALUE
            it.startInstant < endInstant && end > startInstant
        }

        if (collisions.isNotEmpty()) {
            return@withTransaction Result.failure(IllegalStateException("Cannot label gap: overlaps existing record"))
        }

        val interval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = null,
            activityId = activityId,
            kind = "manual",
            startInstant = startInstant,
            endInstant = endInstant
        )
        intervalDao.insertInterval(interval)
        Result.success(interval)
    }

    suspend fun splitGap(
        startInstant: Long,
        splitInstant: Long,
        endInstant: Long,
        activityId1: String,
        activityId2: String
    ): Result<Pair<IntervalEntity, IntervalEntity>> = db.withTransaction {
        if (splitInstant <= startInstant || endInstant <= splitInstant) {
            return@withTransaction Result.failure(IllegalArgumentException("Split instant must lie strictly between start and end"))
        }

        val collisions = intervalDao.getIntervalsInRangeImmediate(startInstant, endInstant).filter {
            val end = it.endInstant ?: Long.MAX_VALUE
            it.startInstant < endInstant && end > startInstant
        }
        if (collisions.isNotEmpty()) {
            return@withTransaction Result.failure(IllegalStateException("Cannot split gap: overlaps existing record"))
        }

        val first = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = null,
            activityId = activityId1,
            kind = "manual",
            startInstant = startInstant,
            endInstant = splitInstant
        )
        val second = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = null,
            activityId = activityId2,
            kind = "manual",
            startInstant = splitInstant,
            endInstant = endInstant
        )
        intervalDao.insertIntervals(listOf(first, second))
        Result.success(Pair(first, second))
    }

    suspend fun addManualEntry(
        startInstant: Long,
        endInstant: Long,
        activityId: String,
        kind: String = "manual",
        reason: String? = null
    ): Result<IntervalEntity> = db.withTransaction {
        if (endInstant <= startInstant) {
            return@withTransaction Result.failure(IllegalArgumentException("End instant must be after start instant"))
        }

        val collisions = intervalDao.getIntervalsInRangeImmediate(startInstant, endInstant).filter {
            val end = it.endInstant ?: Long.MAX_VALUE
            it.startInstant < endInstant && end > startInstant
        }
        if (collisions.isNotEmpty()) {
            return@withTransaction Result.failure(IllegalStateException("Cannot add entry: overlaps an existing recorded interval"))
        }

        val interval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = null,
            activityId = activityId,
            kind = kind,
            startInstant = startInstant,
            endInstant = endInstant,
            reason = reason
        )
        intervalDao.insertInterval(interval)
        Result.success(interval)
    }

    suspend fun editInterval(
        intervalId: String,
        newStart: Long,
        newEnd: Long,
        newActivityId: String?,
        newReason: String?
    ): Result<IntervalEntity> = db.withTransaction {
        val existing = intervalDao.getIntervalById(intervalId)
            ?: return@withTransaction Result.failure(IllegalArgumentException("Interval not found"))

        if (newEnd <= newStart) {
            return@withTransaction Result.failure(IllegalArgumentException("End time must be after start time"))
        }

        // Collision check excluding self
        val collisions = intervalDao.getIntervalsInRangeImmediate(newStart, newEnd).filter {
            it.id != intervalId && ((it.endInstant ?: Long.MAX_VALUE) > newStart && it.startInstant < newEnd)
        }
        if (collisions.isNotEmpty()) {
            return@withTransaction Result.failure(IllegalStateException("Edit rejected: overlapping with existing interval"))
        }

        val updated = existing.copy(
            startInstant = newStart,
            endInstant = newEnd,
            activityId = newActivityId ?: existing.activityId,
            reason = newReason ?: existing.reason,
            revision = existing.revision + 1
        )
        intervalDao.updateInterval(updated)
        Result.success(updated)
    }

    suspend fun deleteInterval(intervalId: String): Result<Unit> = db.withTransaction {
        val existing = intervalDao.getIntervalById(intervalId)
            ?: return@withTransaction Result.failure(IllegalArgumentException("Interval not found"))
        intervalDao.deleteInterval(existing)
        Result.success(Unit)
    }

    // --- SLEEP & WAKE MARKERS ---

    suspend fun recordWakeMarker(date: String, instant: Long = System.currentTimeMillis()): Result<WakeMarkerEntity> {
        val marker = WakeMarkerEntity(date = date, wakeInstant = instant)
        wakeMarkerDao.insertWakeMarker(marker)
        return Result.success(marker)
    }

    suspend fun recordSleepInterval(startInstant: Long, endInstant: Long): Result<IntervalEntity> = db.withTransaction {
        if (endInstant <= startInstant) {
            return@withTransaction Result.failure(IllegalArgumentException("Sleep end must be after start"))
        }
        val interval = IntervalEntity(
            id = UUID.randomUUID().toString(),
            sessionId = null,
            activityId = "act_sleep",
            kind = "sleep",
            startInstant = startInstant,
            endInstant = endInstant
        )
        intervalDao.insertInterval(interval)
        Result.success(interval)
    }

    // --- PRIORITIES CRUD ---

    suspend fun setPriorities(localDate: String, titles: List<String>) = db.withTransaction {
        priorityDao.deletePrioritiesForDate(localDate)
        val entities = titles.take(3).filter { it.isNotBlank() }.mapIndexed { index, title ->
            PriorityEntity(
                id = UUID.randomUUID().toString(),
                localDate = localDate,
                title = title.trim(),
                sortOrder = index
            )
        }
        priorityDao.insertPriorities(entities)
    }

    suspend fun togglePriorityCompletion(priorityId: String) = db.withTransaction {
        val list = priorityDao.getAllPrioritiesList()
        val priority = list.find { it.id == priorityId }
        if (priority != null) {
            val updated = priority.copy(
                completedAt = if (priority.completedAt == null) System.currentTimeMillis() else null
            )
            priorityDao.updatePriority(updated)
        }
    }

    // --- ACTIVITY CRUD ---

    suspend fun createActivity(
        name: String,
        categoryId: String,
        iconKey: String,
        targetSeconds: Long? = null
    ): Result<ActivityEntity> {
        val trimmed = name.trim()
        if (trimmed.isEmpty() || trimmed.length > 60) {
            return Result.failure(IllegalArgumentException("Activity name must be between 1 and 60 characters"))
        }
        val activity = ActivityEntity(
            name = trimmed,
            categoryId = categoryId,
            iconKey = iconKey,
            targetSeconds = targetSeconds
        )
        activityDao.insertActivity(activity)
        return Result.success(activity)
    }

    suspend fun updateActivity(activity: ActivityEntity) {
        activityDao.updateActivity(activity.copy(updatedAt = System.currentTimeMillis()))
    }

    suspend fun archiveActivity(activityId: String) {
        val act = activityDao.getActivityById(activityId)
        if (act != null) {
            activityDao.updateActivity(act.copy(isArchived = true, updatedAt = System.currentTimeMillis()))
        }
    }

    // --- CATEGORY CRUD ---

    suspend fun createCategory(name: String, colorHex: String, iconKey: String): Result<CategoryEntity> {
        val trimmed = name.trim()
        if (trimmed.isEmpty() || trimmed.length > 40) {
            return Result.failure(IllegalArgumentException("Category name must be between 1 and 40 characters"))
        }
        val cat = CategoryEntity(name = trimmed, colorHex = colorHex, iconKey = iconKey)
        categoryDao.insertCategory(cat)
        return Result.success(cat)
    }

    suspend fun updateCategory(category: CategoryEntity) {
        categoryDao.updateCategory(category)
    }

    // --- BACKUP & RESTORE & WIPE ---

    suspend fun exportJson(): String {
        val categories = categoryDao.getAllCategoriesList()
        val activities = activityDao.getAllActivitiesList()
        val sessions = sessionDao.getAllSessionsList()
        val intervals = intervalDao.getAllIntervalsList()
        val wakeMarkers = wakeMarkerDao.getAllWakeMarkersList()
        val priorities = priorityDao.getAllPrioritiesList()
        val settings = settingsDao.getSettingsImmediate()

        val json = org.json.JSONObject()
        json.put("version", 1)
        json.put("exportedAt", System.currentTimeMillis())

        val catArray = org.json.JSONArray()
        for (c in categories) {
            val obj = org.json.JSONObject()
            obj.put("id", c.id)
            obj.put("name", c.name)
            obj.put("colorHex", c.colorHex)
            obj.put("iconKey", c.iconKey)
            obj.put("sortOrder", c.sortOrder)
            catArray.put(obj)
        }
        json.put("categories", catArray)

        val actArray = org.json.JSONArray()
        for (a in activities) {
            val obj = org.json.JSONObject()
            obj.put("id", a.id)
            obj.put("name", a.name)
            obj.put("categoryId", a.categoryId)
            obj.put("iconKey", a.iconKey)
            obj.put("isFavorite", a.isFavorite)
            obj.put("isArchived", a.isArchived)
            if (a.targetSeconds != null) obj.put("targetSeconds", a.targetSeconds)
            obj.put("createdAt", a.createdAt)
            actArray.put(obj)
        }
        json.put("activities", actArray)

        val sessArray = org.json.JSONArray()
        for (s in sessions) {
            val obj = org.json.JSONObject()
            obj.put("id", s.id)
            obj.put("activityId", s.activityId)
            obj.put("status", s.status)
            obj.put("startedAt", s.startedAt)
            if (s.endedAt != null) obj.put("endedAt", s.endedAt)
            if (s.targetSeconds != null) obj.put("targetSeconds", s.targetSeconds)
            sessArray.put(obj)
        }
        json.put("sessions", sessArray)

        val intvArray = org.json.JSONArray()
        for (i in intervals) {
            val obj = org.json.JSONObject()
            obj.put("id", i.id)
            if (i.sessionId != null) obj.put("sessionId", i.sessionId)
            if (i.activityId != null) obj.put("activityId", i.activityId)
            obj.put("kind", i.kind)
            obj.put("startInstant", i.startInstant)
            if (i.endInstant != null) obj.put("endInstant", i.endInstant)
            if (i.reason != null) obj.put("reason", i.reason)
            intvArray.put(obj)
        }
        json.put("intervals", intvArray)

        val prioArray = org.json.JSONArray()
        for (p in priorities) {
            val obj = org.json.JSONObject()
            obj.put("id", p.id)
            obj.put("localDate", p.localDate)
            obj.put("title", p.title)
            obj.put("sortOrder", p.sortOrder)
            if (p.completedAt != null) obj.put("completedAt", p.completedAt)
            prioArray.put(obj)
        }
        json.put("priorities", prioArray)

        return json.toString(2)
    }

    suspend fun importJson(jsonStr: String): Result<Int> = db.withTransaction {
        try {
            val root = org.json.JSONObject(jsonStr)
            val version = root.optInt("version", 0)
            if (version != 1) {
                return@withTransaction Result.failure(IllegalArgumentException("Unsupported backup version: $version"))
            }

            var recordCount = 0

            // Parse Categories
            val catArray = root.optJSONArray("categories")
            if (catArray != null) {
                val cats = mutableListOf<CategoryEntity>()
                for (i in 0 until catArray.length()) {
                    val obj = catArray.getJSONObject(i)
                    cats.add(
                        CategoryEntity(
                            id = obj.getString("id"),
                            name = obj.getString("name"),
                            colorHex = obj.getString("colorHex"),
                            iconKey = obj.optString("iconKey", "category"),
                            sortOrder = obj.optInt("sortOrder", i)
                        )
                    )
                }
                categoryDao.insertCategories(cats)
                recordCount += cats.size
            }

            // Parse Activities
            val actArray = root.optJSONArray("activities")
            if (actArray != null) {
                val acts = mutableListOf<ActivityEntity>()
                for (i in 0 until actArray.length()) {
                    val obj = actArray.getJSONObject(i)
                    acts.add(
                        ActivityEntity(
                            id = obj.getString("id"),
                            name = obj.getString("name"),
                            categoryId = obj.getString("categoryId"),
                            iconKey = obj.optString("iconKey", "circle"),
                            isFavorite = obj.optBoolean("isFavorite", false),
                            isArchived = obj.optBoolean("isArchived", false),
                            targetSeconds = if (obj.has("targetSeconds")) obj.getLong("targetSeconds") else null,
                            createdAt = obj.optLong("createdAt", System.currentTimeMillis())
                        )
                    )
                }
                activityDao.insertActivities(acts)
                recordCount += acts.size
            }

            // Parse Sessions
            val sessArray = root.optJSONArray("sessions")
            if (sessArray != null) {
                val sessions = mutableListOf<SessionEntity>()
                for (i in 0 until sessArray.length()) {
                    val obj = sessArray.getJSONObject(i)
                    sessions.add(
                        SessionEntity(
                            id = obj.getString("id"),
                            activityId = obj.getString("activityId"),
                            status = obj.getString("status"),
                            startedAt = obj.getLong("startedAt"),
                            endedAt = if (obj.has("endedAt")) obj.getLong("endedAt") else null,
                            targetSeconds = if (obj.has("targetSeconds")) obj.getLong("targetSeconds") else null
                        )
                    )
                }
                sessionDao.insertSessions(sessions)
                recordCount += sessions.size
            }

            // Parse Intervals
            val intvArray = root.optJSONArray("intervals")
            if (intvArray != null) {
                val intervals = mutableListOf<IntervalEntity>()
                for (i in 0 until intvArray.length()) {
                    val obj = intvArray.getJSONObject(i)
                    intervals.add(
                        IntervalEntity(
                            id = obj.getString("id"),
                            sessionId = if (obj.has("sessionId")) obj.getString("sessionId") else null,
                            activityId = if (obj.has("activityId")) obj.getString("activityId") else null,
                            kind = obj.getString("kind"),
                            startInstant = obj.getLong("startInstant"),
                            endInstant = if (obj.has("endInstant")) obj.getLong("endInstant") else null,
                            reason = if (obj.has("reason")) obj.getString("reason") else null
                        )
                    )
                }
                intervalDao.insertIntervals(intervals)
                recordCount += intervals.size
            }

            Result.success(recordCount)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun eraseAllData() = db.withTransaction {
        db.clearAllTables()
        initializeDefaultsIfNeeded()
    }
}
