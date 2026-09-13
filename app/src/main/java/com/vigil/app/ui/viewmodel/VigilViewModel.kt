package com.vigil.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.vigil.app.data.AppDatabase
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.data.model.CategoryEntity
import com.vigil.app.data.model.IntervalEntity
import com.vigil.app.data.model.PriorityEntity
import com.vigil.app.data.model.SessionEntity
import com.vigil.app.data.model.SettingsEntity
import com.vigil.app.data.model.WakeMarkerEntity
import com.vigil.app.data.repository.DaySummary
import com.vigil.app.data.repository.LiveSessionState
import com.vigil.app.data.repository.ReviewStats
import com.vigil.app.data.repository.VigilRepository
import com.vigil.app.domain.NotificationHelper
import com.vigil.app.ui.components.NavTab
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

data class UndoAction(
    val message: String,
    val undoBlock: suspend () -> Unit
)

class VigilViewModel(application: Application) : AndroidViewModel(application) {

    private val db = AppDatabase.getInstance(application)
    val repository = VigilRepository(db)
    val notificationHelper = NotificationHelper(application)

    // Current navigation tab
    private val _currentTab = MutableStateFlow(NavTab.TODAY)
    val currentTab: StateFlow<NavTab> = _currentTab.asStateFlow()

    private val _showSettings = MutableStateFlow(false)
    val showSettings: StateFlow<Boolean> = _showSettings.asStateFlow()

    // Settings
    private val _settings = MutableStateFlow(SettingsEntity())
    val settings: StateFlow<SettingsEntity> = _settings.asStateFlow()

    // Data lists
    private val _categories = MutableStateFlow<List<CategoryEntity>>(emptyList())
    val categories: StateFlow<List<CategoryEntity>> = _categories.asStateFlow()

    private val _activities = MutableStateFlow<List<ActivityEntity>>(emptyList())
    val activities: StateFlow<List<ActivityEntity>> = _activities.asStateFlow()

    // Live session state (computed & updated per second via ticker)
    private val _liveSessionState = MutableStateFlow(
        LiveSessionState(null, null, null, emptyList(), 0L, 0L, 0L, null)
    )
    val liveSessionState: StateFlow<LiveSessionState> = _liveSessionState.asStateFlow()

    // Timeline selected date
    private val _timelineDate = MutableStateFlow(LocalDate.now())
    val timelineDate: StateFlow<LocalDate> = _timelineDate.asStateFlow()

    private val _timelineSummary = MutableStateFlow<DaySummary?>(null)
    val timelineSummary: StateFlow<DaySummary?> = _timelineSummary.asStateFlow()

    // Priorities
    private val _todayPriorities = MutableStateFlow<List<PriorityEntity>>(emptyList())
    val todayPriorities: StateFlow<List<PriorityEntity>> = _todayPriorities.asStateFlow()

    private val _tomorrowPriorities = MutableStateFlow<List<PriorityEntity>>(emptyList())
    val tomorrowPriorities: StateFlow<List<PriorityEntity>> = _tomorrowPriorities.asStateFlow()

    // Wake marker for today
    private val _todayWakeMarker = MutableStateFlow<WakeMarkerEntity?>(null)
    val todayWakeMarker: StateFlow<WakeMarkerEntity?> = _todayWakeMarker.asStateFlow()

    // Review
    private val _isWeeklyReview = MutableStateFlow(false)
    val isWeeklyReview: StateFlow<Boolean> = _isWeeklyReview.asStateFlow()

    private val _reviewStats = MutableStateFlow<ReviewStats?>(null)
    val reviewStats: StateFlow<ReviewStats?> = _reviewStats.asStateFlow()

    // Undo action for snackbar
    private val _lastUndoAction = MutableStateFlow<UndoAction?>(null)
    val lastUndoAction: StateFlow<UndoAction?> = _lastUndoAction.asStateFlow()

    private var tickerJob: Job? = null

    init {
        viewModelScope.launch {
            repository.initializeDefaultsIfNeeded()
            observeDatabase()
            startDisplayTicker()
            refreshTimeline()
            refreshReview()
        }
    }

    private fun observeDatabase() {
        viewModelScope.launch {
            repository.getSettings().collectLatest {
                if (it != null) _settings.value = it
            }
        }
        viewModelScope.launch {
            repository.getCategories().collectLatest {
                _categories.value = it
            }
        }
        viewModelScope.launch {
            repository.getAllActivities().collectLatest {
                _activities.value = it
            }
        }
        viewModelScope.launch {
            repository.getLiveSession().collectLatest {
                refreshLiveState()
            }
        }
        viewModelScope.launch {
            val todayStr = LocalDate.now().toString()
            repository.getPriorities(todayStr).collectLatest {
                _todayPriorities.value = it
            }
        }
        viewModelScope.launch {
            val tomorrowStr = LocalDate.now().plusDays(1).toString()
            repository.getPriorities(tomorrowStr).collectLatest {
                _tomorrowPriorities.value = it
            }
        }
        viewModelScope.launch {
            val todayStr = LocalDate.now().toString()
            repository.getWakeMarker(todayStr).collectLatest {
                _todayWakeMarker.value = it
            }
        }
    }

    private fun startDisplayTicker() {
        tickerJob?.cancel()
        tickerJob = viewModelScope.launch {
            while (true) {
                delay(1000L)
                if (_liveSessionState.value.session != null) {
                    refreshLiveState()
                }
            }
        }
    }

    private suspend fun refreshLiveState() {
        val state = repository.computeCurrentLiveState()
        _liveSessionState.value = state
    }

    fun selectTab(tab: NavTab) {
        _currentTab.value = tab
        _showSettings.value = false
        if (tab == NavTab.TIMELINE) refreshTimeline()
        if (tab == NavTab.REVIEW) refreshReview()
    }

    fun openSettings() {
        _showSettings.value = true
    }

    fun closeSettings() {
        _showSettings.value = false
    }

    // --- SESSION ACTIONS ---

    fun startSession(activity: ActivityEntity) {
        viewModelScope.launch {
            repository.startSession(activity.id)
            notificationHelper.cancelAllReminders()
            refreshLiveState()
            refreshTimeline()
        }
    }

    fun pauseSession(reason: String? = null) {
        viewModelScope.launch {
            repository.pauseSession(reason = reason)
            refreshLiveState()
            refreshTimeline()

            val actName = _liveSessionState.value.activity?.name
            notificationHelper.showPauseReminder(actName, _settings.value)
        }
    }

    fun updatePauseReason(reason: String) {
        viewModelScope.launch {
            repository.updatePauseReason(reason)
            refreshLiveState()
        }
    }

    fun resumeSession() {
        viewModelScope.launch {
            repository.resumeSession()
            notificationHelper.cancelAllReminders()
            refreshLiveState()
            refreshTimeline()
        }
    }

    fun finishSession() {
        viewModelScope.launch {
            repository.finishSession()
            notificationHelper.cancelAllReminders()
            refreshLiveState()
            refreshTimeline()
            refreshReview()
        }
    }

    fun switchSession(newActivity: ActivityEntity) {
        viewModelScope.launch {
            repository.switchSession(newActivity.id)
            notificationHelper.cancelAllReminders()
            refreshLiveState()
            refreshTimeline()
        }
    }

    // --- TIMELINE MANAGEMENT ---

    fun setTimelineDate(date: LocalDate) {
        _timelineDate.value = date
        refreshTimeline()
    }

    fun refreshTimeline() {
        viewModelScope.launch {
            val summary = repository.getDaySummary(_timelineDate.value)
            _timelineSummary.value = summary
        }
    }

    fun labelWholeGap(startMs: Long, endMs: Long, activity: ActivityEntity) {
        viewModelScope.launch {
            val result = repository.labelGap(startMs, endMs, activity.id)
            result.onSuccess { interval ->
                refreshTimeline()
                refreshReview()

                _lastUndoAction.value = UndoAction(
                    message = "Labeled gap as ${activity.name}",
                    undoBlock = {
                        repository.deleteInterval(interval.id)
                        refreshTimeline()
                        refreshReview()
                    }
                )
            }
        }
    }

    fun labelGap(startMs: Long, endMs: Long, activityId: String) {
        val act = _activities.value.find { it.id == activityId }
        if (act != null) {
            labelWholeGap(startMs, endMs, act)
        } else {
            viewModelScope.launch {
                val result = repository.labelGap(startMs, endMs, activityId)
                result.onSuccess { interval ->
                    refreshTimeline()
                    refreshReview()
                }
            }
        }
    }

    fun splitGap(startMs: Long, splitMs: Long, endMs: Long, actId1: String, actId2: String) {
        viewModelScope.launch {
            val result = repository.splitGap(startMs, splitMs, endMs, actId1, actId2)
            result.onSuccess { (i1, i2) ->
                refreshTimeline()
                refreshReview()

                _lastUndoAction.value = UndoAction(
                    message = "Split gap saved",
                    undoBlock = {
                        repository.deleteInterval(i1.id)
                        repository.deleteInterval(i2.id)
                        refreshTimeline()
                        refreshReview()
                    }
                )
            }
        }
    }

    fun addManualEntry(startInstant: Long, endInstant: Long, activityId: String, reason: String?) {
        viewModelScope.launch {
            val result = repository.addManualEntry(startInstant, endInstant, activityId, "manual", reason)
            result.onSuccess {
                refreshTimeline()
                refreshReview()
            }
        }
    }

    fun editInterval(intervalId: String, newStart: Long, newEnd: Long, activityId: String?, reason: String?) {
        viewModelScope.launch {
            val result = repository.editInterval(intervalId, newStart, newEnd, activityId, reason)
            result.onSuccess {
                refreshTimeline()
                refreshReview()
            }
        }
    }

    fun deleteInterval(intervalId: String) {
        viewModelScope.launch {
            repository.deleteInterval(intervalId)
            refreshTimeline()
            refreshReview()
        }
    }

    fun clearUndo() {
        _lastUndoAction.value = null
    }

    fun triggerUndo() {
        val undo = _lastUndoAction.value ?: return
        viewModelScope.launch {
            undo.undoBlock()
            _lastUndoAction.value = null
        }
    }

    // --- WAKE & SLEEP ---

    fun recordWakeNow() {
        viewModelScope.launch {
            val todayStr = LocalDate.now().toString()
            repository.recordWakeMarker(todayStr)
        }
    }

    fun recordSleepRange(startMs: Long, endMs: Long) {
        viewModelScope.launch {
            repository.recordSleepInterval(startMs, endMs)
            refreshTimeline()
            refreshReview()
        }
    }

    // --- PRIORITIES ---

    fun setTodayPriorities(titles: List<String>) {
        viewModelScope.launch {
            val todayStr = LocalDate.now().toString()
            repository.setPriorities(todayStr, titles)
        }
    }

    fun setTomorrowPriorities(titles: List<String>) {
        viewModelScope.launch {
            val tomorrowStr = LocalDate.now().plusDays(1).toString()
            repository.setPriorities(tomorrowStr, titles)
        }
    }

    fun togglePriority(priorityId: String) {
        viewModelScope.launch {
            repository.togglePriorityCompletion(priorityId)
        }
    }

    // --- REVIEW ---

    fun toggleReviewWeekly(isWeekly: Boolean) {
        _isWeeklyReview.value = isWeekly
        refreshReview()
    }

    fun refreshReview() {
        viewModelScope.launch {
            val today = LocalDate.now()
            val start = if (_isWeeklyReview.value) today.minusDays(6) else today
            val stats = repository.getReviewStats(start, today)
            _reviewStats.value = stats
        }
    }

    // --- ACTIVITIES & CATEGORIES ---

    fun createActivity(name: String, categoryId: String, targetSeconds: Long?) {
        viewModelScope.launch {
            repository.createActivity(name, categoryId, "circle", targetSeconds)
        }
    }

    fun toggleActivityFavorite(activity: ActivityEntity) {
        viewModelScope.launch {
            repository.updateActivity(activity.copy(isFavorite = !activity.isFavorite))
        }
    }

    fun archiveActivity(activityId: String) {
        viewModelScope.launch {
            repository.archiveActivity(activityId)
        }
    }

    fun createCategory(name: String, colorHex: String) {
        viewModelScope.launch {
            repository.createCategory(name, colorHex, "category")
        }
    }

    // --- SETTINGS & BACKUP ---

    fun updateSettings(newSettings: SettingsEntity) {
        viewModelScope.launch {
            repository.updateSettings(newSettings)
            _settings.value = newSettings
        }
    }

    fun exportBackup(onResult: (String) -> Unit) {
        viewModelScope.launch {
            val json = repository.exportJson()
            onResult(json)
        }
    }

    fun importBackup(jsonStr: String, onResult: (Result<Int>) -> Unit) {
        viewModelScope.launch {
            val res = repository.importJson(jsonStr)
            refreshLiveState()
            refreshTimeline()
            refreshReview()
            onResult(res)
        }
    }

    fun resetAllData(onComplete: () -> Unit) {
        viewModelScope.launch {
            repository.eraseAllData()
            refreshLiveState()
            refreshTimeline()
            refreshReview()
            onComplete()
        }
    }

    // --- CONVENIENCE ALIASES & HELPERS FOR SCREENS ---

    val selectedDate: StateFlow<LocalDate> get() = _timelineDate
    val daySummary: StateFlow<DaySummary?> get() = _timelineSummary
    val liveState: StateFlow<LiveSessionState> get() = _liveSessionState
    val activeActivities: StateFlow<List<ActivityEntity>> get() = _activities
    val allActivities: StateFlow<List<ActivityEntity>> get() = _activities

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    fun previousDay() {
        setTimelineDate(_timelineDate.value.minusDays(1))
    }

    fun nextDay() {
        setTimelineDate(_timelineDate.value.plusDays(1))
    }

    fun goToToday() {
        setTimelineDate(LocalDate.now())
    }

    fun setWeeklyReview(isWeekly: Boolean) {
        toggleReviewWeekly(isWeekly)
    }

    fun clearSnackbar() {
        _snackbarMessage.value = null
        clearUndo()
    }

    fun updateDisplayName(name: String) {
        viewModelScope.launch {
            val updated = _settings.value.copy(displayName = name)
            repository.updateSettings(updated)
            _settings.value = updated
        }
    }

    fun updateTheme(theme: String) {
        viewModelScope.launch {
            val updated = _settings.value.copy(themePreference = theme)
            repository.updateSettings(updated)
            _settings.value = updated
        }
    }

    fun updateQuietHours(start: String, end: String) {
        viewModelScope.launch {
            val updated = _settings.value.copy(quietHoursStart = start, quietHoursEnd = end)
            repository.updateSettings(updated)
            _settings.value = updated
        }
    }

    fun updateReminders(enabled: Boolean, pauseMin: Int, idleMin: Int) {
        viewModelScope.launch {
            val updated = _settings.value.copy(
                remindersEnabled = enabled,
                pauseReminderMinutes = pauseMin,
                idleReminderMinutes = idleMin
            )
            repository.updateSettings(updated)
            _settings.value = updated
        }
    }

    fun updateAccessibility(reducedMotion: Boolean, haptics: Boolean) {
        viewModelScope.launch {
            val updated = _settings.value.copy(
                reducedMotionEnabled = reducedMotion,
                hapticsEnabled = haptics
            )
            repository.updateSettings(updated)
            _settings.value = updated
        }
    }

    fun testReminderNotification() {
        notificationHelper.showTestNotification(_settings.value)
    }

    suspend fun exportJson(): String = repository.exportJson()

    suspend fun importJson(json: String): Result<Int> {
        val res = repository.importJson(json)
        if (res.isSuccess) {
            refreshLiveState()
            refreshTimeline()
            refreshReview()
        }
        return res
    }

    fun wipeDatabase() {
        resetAllData {}
    }

    fun completeOnboarding(displayName: String) {
        viewModelScope.launch {
            val updated = _settings.value.copy(
                displayName = displayName,
                hasCompletedOnboarding = true
            )
            repository.updateSettings(updated)
            _settings.value = updated
        }
    }
}
