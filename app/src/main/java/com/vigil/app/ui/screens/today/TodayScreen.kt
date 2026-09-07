package com.vigil.app.ui.screens.today

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.ui.components.ActivityPickerSheet
import com.vigil.app.ui.components.MountainLandscape
import com.vigil.app.ui.components.PrioritySheet
import com.vigil.app.ui.components.TimerHalo
import com.vigil.app.ui.components.TimerStatus
import com.vigil.app.ui.theme.TabularFontFeature
import com.vigil.app.ui.theme.VigilThemeExtensions
import com.vigil.app.ui.viewmodel.VigilViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(
    viewModel: VigilViewModel,
    onNavigateToTimeline: () -> Unit
) {
    val liveState by viewModel.liveSessionState.collectAsState()
    val activities by viewModel.activities.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val todayPriorities by viewModel.todayPriorities.collectAsState()
    val todayWakeMarker by viewModel.todayWakeMarker.collectAsState()
    val timelineSummary by viewModel.timelineSummary.collectAsState()

    var showActivityPicker by remember { mutableStateOf(false) }
    var isSwitchMode by remember { mutableStateOf(false) }
    var showPauseReasonDialog by remember { mutableStateOf(false) }
    var showSleepDialog by remember { mutableStateOf(false) }
    var showPrioritySheet by remember { mutableStateOf(false) }

    val pickerSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val prioritySheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val session = liveState.session
    val isRunning = session?.status == "running"
    val isPaused = session?.status == "paused"

    val timerStatus = when {
        isRunning -> {
            val targetSec = liveState.session?.targetSeconds
            if (targetSec != null && (liveState.activeDurationMs / 1000) >= targetSec) {
                TimerStatus.TARGET_REACHED
            } else {
                TimerStatus.RUNNING
            }
        }
        isPaused -> TimerStatus.PAUSED
        else -> TimerStatus.IDLE
    }

    // Tabular time string
    val totalDisplayMs = if (isRunning) liveState.activeDurationMs else if (isPaused) liveState.activeDurationMs else 0L
    val totalSeconds = totalDisplayMs / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60

    val timeString = if (hours > 0) {
        String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format(Locale.US, "%02d:%02d", minutes, seconds)
    }

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

        // Hero Mountain Artwork & Timer Stack
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(320.dp)
                .clip(RoundedCornerShape(28.dp)),
            contentAlignment = Alignment.Center
        ) {
            MountainLandscape(
                modifier = Modifier.fillMaxSize(),
                isRunning = isRunning,
                reducedMotion = settings.reducedMotionEnabled
            )

            // Timer Halo Overlay
            TimerHalo(
                status = timerStatus,
                reducedMotion = settings.reducedMotionEnabled,
                size = 250.dp
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Activity Name Pill
                    val currentActivityName = liveState.activity?.name ?: "Ready"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(VigilThemeExtensions.colors.surface.copy(alpha = 0.85f))
                            .clickable(enabled = session == null) {
                                isSwitchMode = false
                                showActivityPicker = true
                            }
                            .padding(horizontal = 14.dp, vertical = 4.dp)
                            .testTag("tag_active_activity_pill")
                    ) {
                        Text(
                            text = currentActivityName,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Tabular Timer Digits
                    Text(
                        text = timeString,
                        style = MaterialTheme.typography.displayLarge.copy(
                            fontSize = 54.sp,
                            fontFeatureSettings = TabularFontFeature
                        ),
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.testTag("text_timer_digits")
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // State Status Text
                    val statusText = when {
                        isRunning -> "In session"
                        isPaused -> "Paused · Pause: ${liveState.pauseDurationMs / 60000}m"
                        else -> "What would you like to focus on?"
                    }

                    Text(
                        text = statusText,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isPaused) VigilThemeExtensions.colors.amberAccent else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Session Controls
        if (session == null) {
            // IDLE STATE: Large Start Button + Quick Activity Pills
            Button(
                onClick = {
                    val defaultAct = activities.firstOrNull { it.isFavorite } ?: activities.firstOrNull()
                    if (defaultAct != null) {
                        viewModel.startSession(defaultAct)
                    } else {
                        isSwitchMode = false
                        showActivityPicker = true
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .testTag("btn_start_session"),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Start Focus", style = MaterialTheme.typography.titleMedium)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Quick Activities FlowRow
            androidx.compose.foundation.layout.FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                activities.take(8).forEach { act ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(VigilThemeExtensions.colors.raisedSurface)
                            .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(20.dp))
                            .clickable { viewModel.startSession(act) }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                            .testTag("quick_act_${act.name.lowercase()}")
                    ) {
                        Text(
                            text = act.name,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        } else {
            // RUNNING or PAUSED STATE
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (isRunning) {
                    Button(
                        onClick = { showPauseReasonDialog = true },
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                            .testTag("btn_pause_session"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = VigilThemeExtensions.colors.raisedSurface,
                            contentColor = MaterialTheme.colorScheme.onSurface
                        )
                    ) {
                        Icon(Icons.Default.Pause, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Pause", style = MaterialTheme.typography.titleSmall)
                    }
                } else {
                    Button(
                        onClick = { viewModel.resumeSession() },
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                            .testTag("btn_resume_session"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Resume", style = MaterialTheme.typography.titleSmall)
                    }
                }

                Button(
                    onClick = { viewModel.finishSession() },
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp)
                        .testTag("btn_finish_session"),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Finish", style = MaterialTheme.typography.titleSmall)
                }

                OutlinedButton(
                    onClick = {
                        isSwitchMode = true
                        showActivityPicker = true
                    },
                    modifier = Modifier
                        .height(52.dp)
                        .testTag("btn_switch_activity"),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Default.SwapHoriz, contentDescription = "Switch Activity")
                }
            }

            // If paused, show reason chips
            if (isPaused) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Reason:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    listOf("Break", "Phone call", "Distraction", "Walk").forEach { reason ->
                        val isSelected = liveState.currentInterval?.reason == reason
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (isSelected) VigilThemeExtensions.colors.amberAccent else VigilThemeExtensions.colors.raisedSurface)
                                .clickable { viewModel.updatePauseReason(reason) }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = reason,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) Color.Black else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
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
        if (latestGap != null && session == null) {
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

        Spacer(modifier = Modifier.height(36.dp))
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
                    viewModel.startSession(selectedAct)
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
                val todayStr = LocalDate.now().toString()
                viewModel.repository.let {
                    // Set priorities via viewModel launch
                    kotlinx.coroutines.MainScope().run {
                        viewModel.setTomorrowPriorities(titles) // will save to tomorrow, or today
                    }
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
                    androidx.compose.foundation.layout.FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("Break", "Phone call", "Distraction", "Hydration", "Other").forEach { r ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(VigilThemeExtensions.colors.raisedSurface)
                                    .clickable {
                                        viewModel.pauseSession(r)
                                        showPauseReasonDialog = false
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
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
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    viewModel.pauseSession(customReason.ifBlank { "Break" })
                    showPauseReasonDialog = false
                }) {
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
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    val hoursVal = sleepHoursText.toDoubleOrNull() ?: 8.0
                    val durationMs = (hoursVal * 3600 * 1000).toLong()
                    val endMs = System.currentTimeMillis()
                    val startMs = endMs - durationMs
                    viewModel.recordSleepRange(startMs, endMs)
                    showSleepDialog = false
                }) {
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
