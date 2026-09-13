@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.vigil.app.ui.screens.today

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.ui.components.ActivityPickerSheet
import com.vigil.app.ui.components.FocusTimerComponent
import com.vigil.app.ui.components.PrioritySheet
import com.vigil.app.ui.components.TimerHalo
import com.vigil.app.ui.components.TimerStatus
import com.vigil.app.ui.theme.TabularFontFeature
import com.vigil.app.ui.theme.VigilThemeExtensions
import com.vigil.app.ui.viewmodel.FocusTimerViewModel
import com.vigil.app.ui.viewmodel.VigilViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TodayScreen(
    viewModel: VigilViewModel,
    focusTimerViewModel: FocusTimerViewModel = viewModel(),
    onNavigateToTimeline: () -> Unit
) {
    val liveState by viewModel.liveSessionState.collectAsState()
    val activities by viewModel.activities.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val todayPriorities by viewModel.todayPriorities.collectAsState()
    val todayWakeMarker by viewModel.todayWakeMarker.collectAsState()
    val timelineSummary by viewModel.timelineSummary.collectAsState()

    var isFocusMode by remember { mutableStateOf(false) }
    var selectedNormalActivity by remember { mutableStateOf<ActivityEntity?>(null) }
    var showActivityPicker by remember { mutableStateOf(false) }
    var isSwitchMode by remember { mutableStateOf(false) }
    var showPauseReasonDialog by remember { mutableStateOf(false) }
    var showSleepDialog by remember { mutableStateOf(false) }
    var showPrioritySheet by remember { mutableStateOf(false) }

    val pickerSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val prioritySheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val greeting = remember(settings.displayName) {
        val hour = LocalTime.now().hour
        val period = when {
            hour < 12 -> "Good morning"
            hour < 17 -> "Good afternoon"
            else -> "Good evening"
        }
        if (settings.displayName.isNotBlank()) "$period, ${settings.displayName}" else period
    }

    val todayDateFormatted = remember {
        val now = LocalDate.now()
        val formatter = DateTimeFormatter.ofPattern("EEEE, MMMM d")
        now.format(formatter)
    }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = greeting,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = todayDateFormatted,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (todayWakeMarker != null) {
                val wakeTimeStr = Instant.ofEpochMilli(todayWakeMarker!!.wakeInstant)
                    .atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ofPattern("HH:mm"))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(VigilThemeExtensions.colors.raisedSurface)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.WbSunny,
                        contentDescription = "Awake",
                        tint = VigilThemeExtensions.colors.amberAccent,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Awake $wakeTimeStr",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Mode Switcher: Daily Tracker (Normal Mode) vs. Focus Timer (Deep Focus Mode)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(VigilThemeExtensions.colors.raisedSurface)
                .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(16.dp))
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (!isFocusMode) VigilThemeExtensions.colors.surface else Color.Transparent)
                    .border(
                        if (!isFocusMode) 1.dp else 0.dp,
                        if (!isFocusMode) VigilThemeExtensions.colors.border else Color.Transparent,
                        RoundedCornerShape(12.dp)
                    )
                    .clickable { isFocusMode = false }
                    .padding(vertical = 8.dp)
                    .testTag("tab_daily_tracker"),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = if (!isFocusMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "Daily Tracker",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (!isFocusMode) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (!isFocusMode) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isFocusMode) VigilThemeExtensions.colors.surface else Color.Transparent)
                    .border(
                        if (isFocusMode) 1.dp else 0.dp,
                        if (isFocusMode) VigilThemeExtensions.colors.border else Color.Transparent,
                        RoundedCornerShape(12.dp)
                    )
                    .clickable { isFocusMode = true }
                    .padding(vertical = 8.dp)
                    .testTag("tab_focus_timer"),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Timer,
                        contentDescription = null,
                        tint = if (isFocusMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "Focus Timer",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isFocusMode) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isFocusMode) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Main Timer Card: Displays either Normal Mode (Former Pattern) or Focus Mode (Targeted Deep Work)
        if (isFocusMode) {
            FocusTimerComponent(
                viewModel = focusTimerViewModel,
                onSelectActivityClick = {
                    isSwitchMode = false
                    showActivityPicker = true
                },
                modifier = Modifier.fillMaxWidth()
            )
        } else {
            // Normal Mode: Legacy Pattern restored with clean luminous background & direct pause reasons
            NormalTrackerCard(
                liveState = liveState,
                activities = activities,
                selectedActivity = selectedNormalActivity,
                onSelectActivity = { selectedNormalActivity = it },
                onStartSession = { act -> viewModel.startSession(act) },
                onPauseSession = { reason -> viewModel.pauseSession(reason) },
                onResumeSession = { viewModel.resumeSession() },
                onFinishSession = { viewModel.finishSession() },
                onSwitchActivityClick = {
                    isSwitchMode = true
                    showActivityPicker = true
                },
                onOpenMoreActivities = {
                    isSwitchMode = false
                    showActivityPicker = true
                },
                onOpenPauseDialog = { showPauseReasonDialog = true },
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Quick Daily Habits / Markers ("I'm awake", "Going to sleep")
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(VigilThemeExtensions.colors.raisedSurface)
                    .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(16.dp))
                    .clickable { viewModel.recordWakeNow() }
                    .padding(14.dp)
                    .testTag("btn_record_wake")
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.WbSunny, contentDescription = null, tint = VigilThemeExtensions.colors.amberAccent)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("I'm awake", style = MaterialTheme.typography.titleSmall)
                        Text("Log wake instant", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(VigilThemeExtensions.colors.raisedSurface)
                    .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(16.dp))
                    .clickable { showSleepDialog = true }
                    .padding(14.dp)
                    .testTag("btn_record_sleep")
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Bedtime, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("Rest / Sleep", style = MaterialTheme.typography.titleSmall)
                        Text("Log sleep range", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Unaccounted Gap Prompt (if any trailing gap in today's timeline)
        val latestGap = timelineSummary?.blocks?.filterIsInstance<com.vigil.app.data.repository.TimelineBlock.Gap>()?.lastOrNull()
        if (latestGap != null && liveState.session == null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(VigilThemeExtensions.colors.warmGapSurface)
                    .border(1.dp, VigilThemeExtensions.colors.warmGapText.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .clickable { onNavigateToTimeline() }
                    .padding(14.dp)
                    .testTag("banner_unaccounted_gap")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.HelpOutline,
                            contentDescription = null,
                            tint = VigilThemeExtensions.colors.warmGapText
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Unaccounted Gap (${latestGap.durationMs / 60000}m)",
                                style = MaterialTheme.typography.titleSmall,
                                color = VigilThemeExtensions.colors.warmGapText
                            )
                            Text(
                                text = "Tap to review or label in Timeline",
                                style = MaterialTheme.typography.bodySmall,
                                color = VigilThemeExtensions.colors.warmGapText.copy(alpha = 0.85f)
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }

        // Today's 3 Intentions (Priorities Card)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(VigilThemeExtensions.colors.raisedSurface)
                .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Today's Intentions",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    TextButton(onClick = { showPrioritySheet = true }) {
                        Text(if (todayPriorities.isEmpty()) "Set 3 Intentions" else "Edit")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (todayPriorities.isEmpty()) {
                    Text(
                        text = "No priorities set yet. Intentions set yesterday in Review carry over here.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    todayPriorities.forEach { priority ->
                        val isDone = priority.completedAt != null
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.togglePriority(priority.id) }
                                .padding(vertical = 6.dp)
                                .testTag("priority_item_${priority.sortOrder}")
                        ) {
                            Icon(
                                imageVector = if (isDone) Icons.Outlined.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
                                contentDescription = if (isDone) "Done" else "Pending",
                                tint = if (isDone) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = priority.title,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isDone) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }

        // Generous bottom clearance to ensure content scrolls smoothly above the floating navigation bar
        Spacer(modifier = Modifier.height(130.dp))
    }

    // Modal Bottom Sheets
    if (showActivityPicker) {
        ActivityPickerSheet(
            sheetState = pickerSheetState,
            activities = activities,
            categories = categories,
            onDismiss = { showActivityPicker = false },
            onSelectActivity = { selectedAct ->
                if (isSwitchMode) {
                    viewModel.switchSession(selectedAct)
                } else {
                    selectedNormalActivity = selectedAct
                    if (isFocusMode) {
                        focusTimerViewModel.selectActivity(selectedAct)
                        focusTimerViewModel.startSession()
                    } else {
                        viewModel.startSession(selectedAct)
                    }
                }
                showActivityPicker = false
            },
            onCreateActivity = { name, catId, targetSec ->
                viewModel.createActivity(name, catId, targetSec)
            },
            onToggleFavorite = { viewModel.toggleActivityFavorite(it) }
        )
    }

    if (showPrioritySheet) {
        PrioritySheet(
            dateLabel = "Today",
            existingPriorities = todayPriorities,
            sheetState = prioritySheetState,
            onDismiss = { showPrioritySheet = false },
            onSavePriorities = { titles ->
                kotlinx.coroutines.MainScope().run {
                    viewModel.setTomorrowPriorities(titles)
                }
            }
        )
    }

    // Pause reason dialog
    if (showPauseReasonDialog) {
        var customReason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = {
                viewModel.pauseSession()
                showPauseReasonDialog = false
            },
            title = { Text("Pause Session") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Select or enter a reason for this pause:")
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("Break", "Phone call", "Distraction", "Hydration", "Walk", "Quick task").forEach { r ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(VigilThemeExtensions.colors.raisedSurface)
                                    .clickable {
                                        viewModel.pauseSession(r)
                                        showPauseReasonDialog = false
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                                    .testTag("dialog_pause_reason_${r.lowercase().replace(" ", "_")}")
                            ) {
                                Text(r, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    OutlinedTextField(
                        value = customReason,
                        onValueChange = { customReason = it },
                        label = { Text("Custom reason (optional)") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_custom_pause_reason")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.pauseSession(customReason.ifBlank { "Break" })
                        showPauseReasonDialog = false
                    },
                    modifier = Modifier.testTag("btn_confirm_pause_reason")
                ) {
                    Text("Pause")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    viewModel.pauseSession(null)
                    showPauseReasonDialog = false
                }) {
                    Text("Skip Reason")
                }
            }
        )
    }

    // Sleep log dialog
    if (showSleepDialog) {
        var sleepHoursText by remember { mutableStateOf("8") }
        AlertDialog(
            onDismissRequest = { showSleepDialog = false },
            title = { Text("Record Rest / Sleep") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Log recent sleep duration into your timeline:")
                    OutlinedTextField(
                        value = sleepHoursText,
                        onValueChange = { sleepHoursText = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        label = { Text("Duration (hours)") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_sleep_hours")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val hoursVal = sleepHoursText.toDoubleOrNull() ?: 8.0
                        val durationMs = (hoursVal * 3600 * 1000).toLong()
                        val endMs = System.currentTimeMillis()
                        val startMs = endMs - durationMs
                        viewModel.recordSleepRange(startMs, endMs)
                        showSleepDialog = false
                    },
                    modifier = Modifier.testTag("btn_save_sleep")
                ) {
                    Text("Log Sleep")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSleepDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/**
 * NormalTrackerCard: The former interaction pattern where users can tap what they want to do,
 * view clean tabular time digits with a theme-adaptive luminous center (never black),
 * pause with reasons, switch activities seamlessly, and finish.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun NormalTrackerCard(
    liveState: com.vigil.app.data.repository.LiveSessionState,
    activities: List<ActivityEntity>,
    selectedActivity: ActivityEntity?,
    onSelectActivity: (ActivityEntity) -> Unit,
    onStartSession: (ActivityEntity) -> Unit,
    onPauseSession: (String?) -> Unit,
    onResumeSession: () -> Unit,
    onFinishSession: () -> Unit,
    onSwitchActivityClick: () -> Unit,
    onOpenMoreActivities: () -> Unit,
    onOpenPauseDialog: () -> Unit,
    modifier: Modifier = Modifier
) {
    val session = liveState.session
    val isRunning = session != null && session.status == "running"
    val isPaused = session != null && session.status == "paused"
    val isIdle = session == null

    val activeSecs = liveState.activeDurationMs / 1000L
    val h = activeSecs / 3600
    val m = (activeSecs % 3600) / 60
    val s = activeSecs % 60
    val timerDigits = if (isIdle) "00:00:00" else String.format(Locale.US, "%02d:%02d:%02d", h, m, s)

    val isDark = isSystemInDarkTheme()

    Card(
        modifier = modifier.testTag("tag_normal_tracker_card"),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(
            containerColor = VigilThemeExtensions.colors.raisedSurface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Central Timer Halo Visual with Theme-Adaptive Radiant Disc (NO black background)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.radialGradient(
                            colors = if (isDark) listOf(
                                VigilThemeExtensions.colors.surface,
                                VigilThemeExtensions.colors.raisedSurface
                            ) else listOf(
                                VigilThemeExtensions.colors.canvas.copy(alpha = 0.7f),
                                VigilThemeExtensions.colors.raisedSurface
                            )
                        )
                    )
                    .border(
                        1.dp,
                        VigilThemeExtensions.colors.border.copy(alpha = 0.5f),
                        RoundedCornerShape(24.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                TimerHalo(
                    status = when {
                        isRunning -> TimerStatus.RUNNING
                        isPaused -> TimerStatus.PAUSED
                        else -> TimerStatus.IDLE
                    },
                    targetProgress = null,
                    size = 220.dp
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // Activity Pill
                        val currentAct = liveState.activity ?: selectedActivity ?: activities.firstOrNull { it.isFavorite } ?: activities.firstOrNull()
                        val actName = currentAct?.name ?: "Select Activity"

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(VigilThemeExtensions.colors.surface)
                                .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(14.dp))
                                .clickable {
                                    if (isIdle) {
                                        onOpenMoreActivities()
                                    } else {
                                        onSwitchActivityClick()
                                    }
                                }
                                .padding(horizontal = 12.dp, vertical = 5.dp)
                                .testTag("pill_normal_activity")
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when {
                                            isRunning -> VigilThemeExtensions.colors.mintAccent
                                            isPaused -> VigilThemeExtensions.colors.amberAccent
                                            else -> MaterialTheme.colorScheme.primary
                                        }
                                    )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = actName,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                            if (!isIdle) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.Default.SwapHoriz,
                                    contentDescription = "Switch Activity",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // High-contrast tabular timer digits
                        Text(
                            text = timerDigits,
                            style = MaterialTheme.typography.displayLarge.copy(
                                fontSize = 46.sp,
                                fontFeatureSettings = TabularFontFeature,
                                fontWeight = FontWeight.Bold
                            ),
                            color = if (isPaused) VigilThemeExtensions.colors.amberAccent else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.testTag("text_normal_timer_digits")
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        // Status Subtitle
                        Text(
                            text = when {
                                isRunning -> "In Flow"
                                isPaused -> {
                                    val r = liveState.currentInterval?.reason?.takeIf { it.isNotBlank() } ?: "Break"
                                    "Paused · ${liveState.pauseDurationMs / 60000}m ($r)"
                                }
                                else -> "Ready to begin"
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = when {
                                isPaused -> VigilThemeExtensions.colors.amberAccent
                                isRunning -> VigilThemeExtensions.colors.mintAccent
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Controls & Interactive Sections based on state
            if (isIdle) {
                // Former Activity Selection: Tap any activity chip to pick/start
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "What are you doing now?",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val quickList = activities.filter { it.isFavorite }.ifEmpty { activities.take(6) }
                        val activeSelection = selectedActivity ?: quickList.firstOrNull()

                        quickList.forEach { act ->
                            val isSelected = (act.id == activeSelection?.id)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(
                                        if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                                        else VigilThemeExtensions.colors.surface
                                    )
                                    .border(
                                        1.dp,
                                        if (isSelected) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.border,
                                        RoundedCornerShape(14.dp)
                                    )
                                    .clickable {
                                        onSelectActivity(act)
                                        onStartSession(act)
                                    }
                                    .padding(horizontal = 14.dp, vertical = 8.dp)
                                    .testTag("chip_activity_${act.name.lowercase().replace(" ", "_")}")
                            ) {
                                Text(
                                    text = act.name,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        // More activities button
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(VigilThemeExtensions.colors.surface)
                                .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(14.dp))
                                .clickable { onOpenMoreActivities() }
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                                .testTag("btn_normal_more_activities")
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "More…",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    val effectiveAct = selectedActivity ?: activities.firstOrNull { it.isFavorite } ?: activities.firstOrNull()
                    Button(
                        onClick = {
                            if (effectiveAct != null) {
                                onStartSession(effectiveAct)
                            } else {
                                onOpenMoreActivities()
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("btn_normal_start_session"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = VigilThemeExtensions.colors.mintAccent,
                            contentColor = Color.White
                        )
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (effectiveAct != null) "Start ${effectiveAct.name}" else "Start Activity",
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            } else if (isRunning) {
                // Session is Running: Pause button, Finish button, and quick pause reason chips
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = onOpenPauseDialog,
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("btn_normal_pause"),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = VigilThemeExtensions.colors.amberAccent,
                                contentColor = Color.White
                            )
                        ) {
                            Icon(Icons.Default.Pause, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Pause", fontWeight = FontWeight.SemiBold)
                        }

                        Button(
                            onClick = onFinishSession,
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("btn_normal_finish"),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = VigilThemeExtensions.colors.surface,
                                contentColor = MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Finish", fontWeight = FontWeight.SemiBold)
                        }
                    }

                    // Direct Pause Reason Chips: tap any chip to pause immediately with that reason
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Tap reason to pause directly:",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            listOf("Break", "Phone call", "Walk", "Distraction", "Quick task").forEach { r ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(VigilThemeExtensions.colors.surface)
                                        .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(12.dp))
                                        .clickable { onPauseSession(r) }
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                        .testTag("chip_direct_pause_${r.lowercase().replace(" ", "_")}")
                                ) {
                                    Text(
                                        text = r,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }
            } else if (isPaused) {
                // Session is Paused: Resume, Finish, and current pause reason
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val currentReason = liveState.currentInterval?.reason?.takeIf { it.isNotBlank() } ?: "Break"
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(VigilThemeExtensions.colors.surface)
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Pause,
                                contentDescription = null,
                                tint = VigilThemeExtensions.colors.amberAccent,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Paused for: $currentReason",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        TextButton(
                            onClick = onOpenPauseDialog,
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("Change", style = MaterialTheme.typography.labelSmall)
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = onResumeSession,
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("btn_normal_resume"),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = VigilThemeExtensions.colors.mintAccent,
                                contentColor = Color.White
                            )
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Resume", fontWeight = FontWeight.SemiBold)
                        }

                        Button(
                            onClick = onFinishSession,
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("btn_normal_finish_paused"),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = VigilThemeExtensions.colors.surface,
                                contentColor = MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Finish", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}
