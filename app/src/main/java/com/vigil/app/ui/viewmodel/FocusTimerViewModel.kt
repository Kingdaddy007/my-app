package com.vigil.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.vigil.app.data.AppDatabase
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.data.model.SettingsEntity
import com.vigil.app.data.repository.LiveSessionState
import com.vigil.app.data.repository.TimelineBlock
import com.vigil.app.data.repository.VigilRepository
import com.vigil.app.domain.NotificationHelper
import com.vigil.app.ui.components.TimerStatus
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.LocalDate

enum class FocusTimerMode {
    COUNTDOWN,
    COUNT_UP
}

data class FocusTimerState(
    val selectedActivity: ActivityEntity? = null,
    val availableActivities: List<ActivityEntity> = emptyList(),
    val targetDurationMinutes: Int = 45,
    val timerMode: FocusTimerMode = FocusTimerMode.COUNTDOWN,
    val sessionGoal: String = "",
    val status: TimerStatus = TimerStatus.IDLE,
    val activeDurationMs: Long = 0L,
    val remainingDurationMs: Long = 45 * 60 * 1000L,
    val pauseDurationMs: Long = 0L,
    val totalElapsedMs: Long = 0L,
    val targetProgress: Float = if (targetDurationMinutes > 0 && activeDurationMs > 0L) (activeDurationMs.toFloat() / (targetDurationMinutes * 60 * 1000f)) else 0f,
    val isOvertime: Boolean = false,
    val overtimeMs: Long = 0L,
    val pauseReason: String? = null,
    val todayDeepWorkMinutes: Long = 0L,
    val completedSessionsToday: Int = 0,
    val soundAlertsEnabled: Boolean = true,
    val hapticAlertsEnabled: Boolean = true,
    val showTargetReachedBanner: Boolean = false,
    val currentSessionId: String? = null
)

class FocusTimerViewModel(
    application: Application,
    private val repository: VigilRepository,
    private val notificationHelper: NotificationHelper
) : AndroidViewModel(application) {

    constructor(application: Application) : this(
        application,
        VigilRepository(AppDatabase.getInstance(application)),
        NotificationHelper(application)
    )

    private val _state = MutableStateFlow(FocusTimerState())
    val state: StateFlow<FocusTimerState> = _state.asStateFlow()

    private var tickerJob: Job? = null
    private var settings = SettingsEntity()
    private var targetReachedAlertFired = false

    init {
        viewModelScope.launch {
            repository.initializeDefaultsIfNeeded()
            observeData()
            startTicker()
            refreshTodayStats()
        }
    }

    private fun observeData() {
        viewModelScope.launch {
            repository.getSettings().collectLatest { set ->
                if (set != null) settings = set
            }
        }

        viewModelScope.launch {
            repository.getActiveActivities().collectLatest { activities ->
                _state.value = _state.value.copy(
                    availableActivities = activities,
                    selectedActivity = _state.value.selectedActivity ?: activities.firstOrNull { it.name.contains("Work", ignoreCase = true) }
                    ?: activities.firstOrNull { it.isFavorite }
                    ?: activities.firstOrNull()
                )
            }
        }

        viewModelScope.launch {
            repository.getLiveSession().collectLatest {
                recomputeState()
                refreshTodayStats()
            }
        }
    }

    private fun startTicker() {
        tickerJob?.cancel()
        tickerJob = viewModelScope.launch {
            while (true) {
                delay(1000L)
                val currentStatus = _state.value.status
                if (currentStatus == TimerStatus.RUNNING || currentStatus == TimerStatus.PAUSED || currentStatus == TimerStatus.TARGET_REACHED) {
                    recomputeState()
                }
            }
        }
    }

    private suspend fun recomputeState() {
        val liveState = repository.computeCurrentLiveState()
        val session = liveState.session

        if (session == null) {
            val targetMs = _state.value.targetDurationMinutes * 60 * 1000L
            targetReachedAlertFired = false
            _state.value = _state.value.copy(
                status = TimerStatus.IDLE,
                activeDurationMs = 0L,
                pauseDurationMs = 0L,
                totalElapsedMs = 0L,
                remainingDurationMs = targetMs,
                targetProgress = 0f,
                isOvertime = false,
                overtimeMs = 0L,
                showTargetReachedBanner = false,
                currentSessionId = null
            )
            return
        }

        // Active duration
        val activeMs = liveState.activeDurationMs
        val pauseMs = liveState.pauseDurationMs
        val totalMs = liveState.totalElapsedMs

        // Target
        val sessionTargetSeconds = session.targetSeconds ?: (_state.value.targetDurationMinutes * 60L)
        val targetMs = sessionTargetSeconds * 1000L

        val progress = if (targetMs > 0L) {
            (activeMs.toFloat() / targetMs.toFloat())
        } else {
            0f
        }

        val isTargetReached = targetMs > 0L && activeMs >= targetMs
        val isOvertime = isTargetReached && activeMs > targetMs
        val overtimeMs = if (isOvertime) activeMs - targetMs else 0L
        val remainingMs = if (isTargetReached) 0L else (targetMs - activeMs).coerceAtLeast(0L)

        val computedStatus = when {
            session.status == "paused" -> TimerStatus.PAUSED
            isTargetReached -> TimerStatus.TARGET_REACHED
            session.status == "running" -> TimerStatus.RUNNING
            else -> TimerStatus.IDLE
        }

        // Trigger notification once when target is first reached
        if (isTargetReached && !targetReachedAlertFired && session.status == "running") {
            targetReachedAlertFired = true
            if (_state.value.soundAlertsEnabled) {
                notificationHelper.showTargetReachedReminder(
                    liveState.activity?.name ?: "Deep Work",
                    settings
                )
            }
        }

        _state.value = _state.value.copy(
            selectedActivity = liveState.activity ?: _state.value.selectedActivity,
            targetDurationMinutes = (sessionTargetSeconds / 60L).toInt(),
            status = computedStatus,
            activeDurationMs = activeMs,
            pauseDurationMs = pauseMs,
            totalElapsedMs = totalMs,
            remainingDurationMs = remainingMs,
            targetProgress = progress,
            isOvertime = isOvertime,
            overtimeMs = overtimeMs,
            pauseReason = liveState.currentInterval?.reason,
            showTargetReachedBanner = isTargetReached,
            currentSessionId = session.id
        )
    }

    private suspend fun refreshTodayStats() {
        val today = LocalDate.now()
        val summary = repository.getDaySummary(today)
        var deepWorkMs = 0L
        var sessionCount = 0

        for (block in summary.blocks) {
            if (block is TimelineBlock.Recorded) {
                val actName = block.activity?.name?.lowercase() ?: ""
                val catName = block.category?.name?.lowercase() ?: ""
                if (actName.contains("work") || actName.contains("deep") || actName.contains("study") ||
                    actName.contains("code") || actName.contains("writing") || catName.contains("work") ||
                    catName.contains("deep") || catName.contains("learning")
                ) {
                    deepWorkMs += block.displayDurationMs
                }
                if (block.interval.sessionId != null) {
                    sessionCount++
                }
            }
        }

        _state.value = _state.value.copy(
            todayDeepWorkMinutes = deepWorkMs / 60_000L,
            completedSessionsToday = sessionCount
        )
    }

    // --- USER ACTIONS ---

    fun setTargetDurationMinutes(minutes: Int) {
        val clamped = minutes.coerceIn(1, 240)
        val targetMs = clamped * 60 * 1000L
        _state.value = _state.value.copy(
            targetDurationMinutes = clamped,
            remainingDurationMs = targetMs
        )
    }

    fun setTimerMode(mode: FocusTimerMode) {
        _state.value = _state.value.copy(timerMode = mode)
    }

    fun setSessionGoal(goal: String) {
        _state.value = _state.value.copy(sessionGoal = goal)
    }

    fun selectActivity(activity: ActivityEntity) {
        _state.value = _state.value.copy(selectedActivity = activity)
    }

    fun startSession() {
        viewModelScope.launch {
            val activity = _state.value.selectedActivity
                ?: _state.value.availableActivities.firstOrNull()
                ?: return@launch

            val targetSeconds = _state.value.targetDurationMinutes * 60L
            targetReachedAlertFired = false
            repository.startSession(activityId = activity.id, targetSeconds = targetSeconds)
            notificationHelper.cancelAllReminders()
            recomputeState()
        }
    }

    fun pauseSession(reason: String? = null) {
        viewModelScope.launch {
            repository.pauseSession(reason = reason)
            recomputeState()

            val actName = _state.value.selectedActivity?.name ?: "Focus"
            notificationHelper.showPauseReminder(actName, settings)
        }
    }

    fun updatePauseReason(reason: String) {
        viewModelScope.launch {
            repository.updatePauseReason(reason)
            recomputeState()
        }
    }

    fun resumeSession() {
        viewModelScope.launch {
            repository.resumeSession()
            notificationHelper.cancelAllReminders()
            recomputeState()
        }
    }

    fun finishSession() {
        viewModelScope.launch {
            repository.finishSession()
            notificationHelper.cancelAllReminders()
            targetReachedAlertFired = false
            recomputeState()
            refreshTodayStats()
        }
    }

    fun extendSession(extraMinutes: Int) {
        viewModelScope.launch {
            val extraSeconds = extraMinutes * 60L
            repository.extendSessionTarget(extraSeconds)
            targetReachedAlertFired = false
            _state.value = _state.value.copy(
                targetDurationMinutes = _state.value.targetDurationMinutes + extraMinutes,
                showTargetReachedBanner = false
            )
            recomputeState()
        }
    }

    fun dismissTargetAlert() {
        _state.value = _state.value.copy(showTargetReachedBanner = false)
    }

    fun toggleSoundAlerts(enabled: Boolean) {
        _state.value = _state.value.copy(soundAlertsEnabled = enabled)
    }

    fun toggleHapticAlerts(enabled: Boolean) {
        _state.value = _state.value.copy(hapticAlertsEnabled = enabled)
    }

    fun resetTimer() {
        viewModelScope.launch {
            if (_state.value.status != TimerStatus.IDLE) {
                repository.finishSession()
                notificationHelper.cancelAllReminders()
            }
            targetReachedAlertFired = false
            recomputeState()
        }
    }
}
