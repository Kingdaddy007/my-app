@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.vigil.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreTime
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Vibration
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.ui.theme.VigilThemeExtensions
import com.vigil.app.ui.viewmodel.FocusTimerMode
import com.vigil.app.ui.viewmodel.FocusTimerState
import com.vigil.app.ui.viewmodel.FocusTimerViewModel
import java.util.Locale

private const val TabularFontFeature = "tnum"

@Composable
fun FocusTimerComponent(
    viewModel: FocusTimerViewModel,
    modifier: Modifier = Modifier,
    onSelectActivityClick: (() -> Unit)? = null
) {
    val state by viewModel.state.collectAsState()

    var showCustomSheet by remember { mutableStateOf(false) }
    var showGoalDialog by remember { mutableStateOf(false) }
    var showPauseReasonDialog by remember { mutableStateOf(false) }

    FocusTimerComponentView(
        state = state,
        onStartSession = { viewModel.startSession() },
        onPauseSession = { reason -> viewModel.pauseSession(reason) },
        onResumeSession = { viewModel.resumeSession() },
        onFinishSession = { viewModel.finishSession() },
        onResetTimer = { viewModel.resetTimer() },
        onSelectPreset = { minutes -> viewModel.setTargetDurationMinutes(minutes) },
        onToggleTimerMode = {
            val newMode = if (state.timerMode == FocusTimerMode.COUNTDOWN) FocusTimerMode.COUNT_UP else FocusTimerMode.COUNTDOWN
            viewModel.setTimerMode(newMode)
        },
        onExtendSession = { extraMinutes -> viewModel.extendSession(extraMinutes) },
        onOpenCustomSettings = { showCustomSheet = true },
        onEditGoalClick = { showGoalDialog = true },
        onSelectActivityClick = onSelectActivityClick,
        onUpdatePauseReason = { reason -> viewModel.updatePauseReason(reason) },
        onOpenPauseReasonPrompt = { showPauseReasonDialog = true },
        modifier = modifier
    )

    // Customization Sheet
    if (showCustomSheet) {
        FocusTimerCustomizationSheet(
            state = state,
            onDismiss = { showCustomSheet = false },
            onSave = { duration, mode, goal, sound, haptic ->
                viewModel.setTargetDurationMinutes(duration)
                viewModel.setTimerMode(mode)
                viewModel.setSessionGoal(goal)
                viewModel.toggleSoundAlerts(sound)
                viewModel.toggleHapticAlerts(haptic)
                showCustomSheet = false
            }
        )
    }

    // Edit Goal Dialog
    if (showGoalDialog) {
        var goalInput by remember { mutableStateOf(state.sessionGoal) }
        AlertDialog(
            onDismissRequest = { showGoalDialog = false },
            title = { Text("Deep Work Intention", style = MaterialTheme.typography.titleMedium) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Set a single clear goal for this deep work session:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedTextField(
                        value = goalInput,
                        onValueChange = { goalInput = it },
                        placeholder = { Text("e.g., Complete API Architecture") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_focus_goal")
                    )

                    Text("Quick Suggestions:", style = MaterialTheme.typography.labelSmall)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("Architecture", "Code Review", "Writing", "Deep Study", "Problem Solving").forEach { suggestion ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(VigilThemeExtensions.colors.raisedSurface)
                                    .clickable { goalInput = suggestion }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(suggestion, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.setSessionGoal(goalInput)
                        showGoalDialog = false
                    },
                    modifier = Modifier.testTag("btn_save_focus_goal")
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showGoalDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Pause Reason Dialog
    if (showPauseReasonDialog) {
        AlertDialog(
            onDismissRequest = {
                viewModel.pauseSession(null)
                showPauseReasonDialog = false
            },
            title = { Text("Pause Focus Session") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "What is interrupting or pausing your session?",
                        style = MaterialTheme.typography.bodySmall
                    )
                    listOf("Break", "Phone call", "Distraction", "Walk", "Quick task", "Skip reason").forEach { reason ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(VigilThemeExtensions.colors.raisedSurface)
                                .clickable {
                                    val r = if (reason == "Skip reason") null else reason
                                    viewModel.pauseSession(r)
                                    showPauseReasonDialog = false
                                }
                                .padding(horizontal = 16.dp, vertical = 12.dp)
                                .testTag("pause_reason_${reason.lowercase().replace(" ", "_")}")
                        ) {
                            Text(reason, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = {
                    viewModel.pauseSession(null)
                    showPauseReasonDialog = false
                }) {
                    Text("Dismiss")
                }
            }
        )
    }
}

@Composable
fun FocusTimerComponentView(
    state: FocusTimerState,
    onStartSession: () -> Unit,
    onPauseSession: (String?) -> Unit,
    onResumeSession: () -> Unit,
    onFinishSession: () -> Unit,
    onResetTimer: () -> Unit,
    onSelectPreset: (Int) -> Unit,
    onToggleTimerMode: () -> Unit,
    onExtendSession: (Int) -> Unit,
    onOpenCustomSettings: () -> Unit,
    onEditGoalClick: () -> Unit,
    onSelectActivityClick: (() -> Unit)?,
    onUpdatePauseReason: (String) -> Unit,
    onOpenPauseReasonPrompt: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isRunning = state.status == TimerStatus.RUNNING
    val isPaused = state.status == TimerStatus.PAUSED
    val isTargetReached = state.status == TimerStatus.TARGET_REACHED
    val isIdle = state.status == TimerStatus.IDLE

    val timerDigits = when (state.timerMode) {
        FocusTimerMode.COUNTDOWN -> {
            if (state.isOvertime) {
                val totalSecs = state.overtimeMs / 1000L
                val m = totalSecs / 60
                val s = totalSecs % 60
                String.format(Locale.US, "+%02d:%02d", m, s)
            } else {
                val totalSecs = state.remainingDurationMs / 1000L
                val m = totalSecs / 60
                val s = totalSecs % 60
                String.format(Locale.US, "%02d:%02d", m, s)
            }
        }
        FocusTimerMode.COUNT_UP -> {
            val totalSecs = state.activeDurationMs / 1000L
            val h = totalSecs / 3600
            val m = (totalSecs % 3600) / 60
            val s = totalSecs % 60
            if (h > 0) {
                String.format(Locale.US, "%02d:%02d:%02d", h, m, s)
            } else {
                String.format(Locale.US, "%02d:%02d", m, s)
            }
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("tag_focus_timer_component"),
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
            // Header Bar: Mode & Customizer Action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Mode Toggle Button
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(VigilThemeExtensions.colors.surface)
                        .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(16.dp))
                        .clickable { onToggleTimerMode() }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .testTag("toggle_timer_mode")
                ) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = "Timer Mode",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (state.timerMode == FocusTimerMode.COUNTDOWN) "Countdown (${state.targetDurationMinutes}m)" else "Stopwatch Mode",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                // Customization Settings Button
                IconButton(
                    onClick = onOpenCustomSettings,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(VigilThemeExtensions.colors.surface)
                        .testTag("btn_custom_timer_settings")
                ) {
                    Icon(
                        imageVector = Icons.Default.Tune,
                        contentDescription = "Customize Timer",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Intention / Goal Tag
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(VigilThemeExtensions.colors.surface)
                    .clickable { onEditGoalClick() }
                    .padding(horizontal = 14.dp, vertical = 6.dp)
                    .testTag("tag_session_goal")
            ) {
                Icon(
                    imageVector = Icons.Default.Bolt,
                    contentDescription = null,
                    tint = VigilThemeExtensions.colors.amberAccent,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (state.sessionGoal.isNotBlank()) state.sessionGoal else "Tap to set focus intention…",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (state.sessionGoal.isNotBlank()) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "Edit Goal",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.size(12.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Central Timer Halo Visual with Clean Luminous Disc
            val isDark = isSystemInDarkTheme()
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
                    status = state.status,
                    targetProgress = state.targetProgress,
                    size = 220.dp
                ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Activity Pill
                    val actName = state.selectedActivity?.name ?: "Deep Work"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(VigilThemeExtensions.colors.surface.copy(alpha = 0.9f))
                            .clickable(enabled = isIdle && onSelectActivityClick != null) {
                                onSelectActivityClick?.invoke()
                            }
                            .padding(horizontal = 12.dp, vertical = 4.dp)
                            .testTag("pill_timer_activity")
                    ) {
                        Text(
                            text = actName,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Tabular Timer Digits
                    Text(
                        text = timerDigits,
                        style = MaterialTheme.typography.displayLarge.copy(
                            fontSize = 48.sp,
                            fontFeatureSettings = TabularFontFeature,
                            fontWeight = FontWeight.Bold
                        ),
                        color = if (state.isOvertime) VigilThemeExtensions.colors.amberAccent else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.testTag("text_focus_timer_digits")
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Status Indicator
                    val statusLabel = when {
                        state.isOvertime -> "Overtime Flow"
                        isTargetReached -> "Target Reached!"
                        isRunning -> "In Flow"
                        isPaused -> "Paused · ${state.pauseDurationMs / 60000}m"
                        else -> "Target: ${state.targetDurationMinutes} min"
                    }

                    Text(
                        text = statusLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = when {
                            state.isOvertime || isPaused -> VigilThemeExtensions.colors.amberAccent
                            isRunning -> VigilThemeExtensions.colors.mintAccent
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                }
            }
        }

            Spacer(modifier = Modifier.height(12.dp))

            // Target Progress Bar
            if (!isIdle) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    LinearProgressIndicator(
                        progress = { state.targetProgress.coerceIn(0f, 1f) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = if (isTargetReached) VigilThemeExtensions.colors.amberAccent else VigilThemeExtensions.colors.mintAccent,
                        trackColor = VigilThemeExtensions.colors.border
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Focused: ${state.activeDurationMs / 60000}m",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = if (state.targetProgress >= 1f) "100% Target Met" else "${(state.targetProgress * 100).toInt()}% of ${state.targetDurationMinutes}m",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Duration Presets (Shown when IDLE)
            if (isIdle) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    listOf(25, 45, 60, 90).forEach { mins ->
                        val isSelected = state.targetDurationMinutes == mins
                        val bgColor by animateColorAsState(
                            targetValue = if (isSelected) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.surface,
                            animationSpec = tween(150),
                            label = "preset_bg"
                        )
                        val textColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(bgColor)
                                .border(1.dp, if (isSelected) Color.Transparent else VigilThemeExtensions.colors.border, RoundedCornerShape(12.dp))
                                .clickable { onSelectPreset(mins) }
                                .testTag("chip_preset_$mins"),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${mins}m",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = textColor
                            )
                        }
                    }

                    // Custom Button
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(VigilThemeExtensions.colors.surface)
                            .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(12.dp))
                            .clickable { onOpenCustomSettings() }
                            .testTag("chip_preset_custom"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Custom",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            // Target Reached Banner / Actions
            if (isTargetReached && state.showTargetReachedBanner) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 14.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = VigilThemeExtensions.colors.amberAccent.copy(alpha = 0.15f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "🎯 Target Reached!",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = VigilThemeExtensions.colors.amberAccent
                            )
                            Text(
                                text = "Keep flowing or finish to log your session.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        OutlinedButton(
                            onClick = { onExtendSession(15) },
                            modifier = Modifier.testTag("btn_extend_target_reached")
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("+15m")
                        }
                    }
                }
            }

            // Flow Extension Pills (When Running or Target Reached)
            if (isRunning || isTargetReached) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Extend flow:",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    listOf(5, 15, 30).forEach { extra ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(VigilThemeExtensions.colors.surface)
                                .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(14.dp))
                                .clickable { onExtendSession(extra) }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                .testTag("btn_extend_${extra}m")
                        ) {
                            Text(
                                text = "+${extra}m",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Primary Control Buttons
            if (isIdle) {
                Button(
                    onClick = onStartSession,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .testTag("btn_focus_start"),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Start Focus (${state.targetDurationMinutes}m)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isRunning) {
                        Button(
                            onClick = onOpenPauseReasonPrompt,
                            modifier = Modifier
                                .weight(1f)
                                .height(52.dp)
                                .testTag("btn_focus_pause"),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = VigilThemeExtensions.colors.surface,
                                contentColor = MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(Icons.Default.Pause, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Pause", style = MaterialTheme.typography.titleSmall)
                        }
                    } else {
                        Button(
                            onClick = onResumeSession,
                            modifier = Modifier
                                .weight(1f)
                                .height(52.dp)
                                .testTag("btn_focus_resume"),
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
                        onClick = onFinishSession,
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                            .testTag("btn_focus_finish"),
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
                }

                // Pause Reason Chips (if paused)
                if (isPaused) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "Pause reason:",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf("Break", "Phone call", "Distraction", "Walk", "Quick task").forEach { r ->
                                val selected = state.pauseReason == r
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(if (selected) VigilThemeExtensions.colors.amberAccent else VigilThemeExtensions.colors.surface)
                                        .clickable { onUpdatePauseReason(r) }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = r,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (selected) Color.Black else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Daily Deep Work Summary Pill
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(VigilThemeExtensions.colors.surface)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .testTag("summary_today_deep_work"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Bolt,
                        contentDescription = null,
                        tint = VigilThemeExtensions.colors.amberAccent,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Deep Work Today",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Text(
                    text = "${state.todayDeepWorkMinutes}m · ${state.completedSessionsToday} sessions",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun FocusTimerCustomizationSheet(
    state: FocusTimerState,
    onDismiss: () -> Unit,
    onSave: (duration: Int, mode: FocusTimerMode, goal: String, sound: Boolean, haptic: Boolean) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var durationMinutes by remember { mutableStateOf(state.targetDurationMinutes) }
    var timerMode by remember { mutableStateOf(state.timerMode) }
    var goalText by remember { mutableStateOf(state.sessionGoal) }
    var soundEnabled by remember { mutableStateOf(state.soundAlertsEnabled) }
    var hapticEnabled by remember { mutableStateOf(state.hapticAlertsEnabled) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = VigilThemeExtensions.colors.raisedSurface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = "Customize Focus Timer",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Duration Slider & Stepper
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Target Duration",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "$durationMinutes minutes",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Slider(
                    value = durationMinutes.toFloat(),
                    onValueChange = { durationMinutes = it.toInt() },
                    valueRange = 5f..180f,
                    steps = 34, // 5m steps
                    colors = SliderDefaults.colors(
                        thumbColor = MaterialTheme.colorScheme.primary,
                        activeTrackColor = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier.testTag("slider_target_duration")
                )

                // Quick selector chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(20, 25, 45, 50, 60, 90, 120).forEach { m ->
                        val selected = durationMinutes == m
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (selected) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.surface)
                                .clickable { durationMinutes = m }
                                .padding(vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${m}m",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            // Mode Selector: Countdown vs Count-up
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Timer Display Mode",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (timerMode == FocusTimerMode.COUNTDOWN) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.surface)
                            .clickable { timerMode = FocusTimerMode.COUNTDOWN }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Countdown",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = if (timerMode == FocusTimerMode.COUNTDOWN) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (timerMode == FocusTimerMode.COUNT_UP) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.surface)
                            .clickable { timerMode = FocusTimerMode.COUNT_UP }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Stopwatch (Count Up)",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = if (timerMode == FocusTimerMode.COUNT_UP) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Session Goal Input
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Default Focus Goal / Intention",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                OutlinedTextField(
                    value = goalText,
                    onValueChange = { goalText = it },
                    placeholder = { Text("e.g., Deep Work Sprint") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Alert Switches
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (soundEnabled) Icons.Default.Notifications else Icons.Default.NotificationsOff,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Target Completion Notification", style = MaterialTheme.typography.bodyMedium)
                    }
                    Switch(
                        checked = soundEnabled,
                        onCheckedChange = { soundEnabled = it }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Vibration,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Haptic Feedback on Completion", style = MaterialTheme.typography.bodyMedium)
                    }
                    Switch(
                        checked = hapticEnabled,
                        onCheckedChange = { hapticEnabled = it }
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Save & Close Button
            Button(
                onClick = {
                    onSave(durationMinutes, timerMode, goalText, soundEnabled, hapticEnabled)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("btn_save_timer_customization"),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Apply Customization", style = MaterialTheme.typography.titleMedium)
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
