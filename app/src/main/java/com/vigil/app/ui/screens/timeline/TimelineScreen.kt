package com.vigil.app.ui.screens.timeline

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vigil.app.data.model.IntervalEntity
import com.vigil.app.data.repository.TimelineBlock
import com.vigil.app.ui.components.ActivityPickerSheet
import com.vigil.app.ui.components.GapCard
import com.vigil.app.ui.components.ManualEntryDialog
import com.vigil.app.ui.components.SplitGapDialog
import com.vigil.app.ui.theme.AmberAccent
import com.vigil.app.ui.theme.CategorySleep
import com.vigil.app.ui.theme.MintAccent
import com.vigil.app.ui.theme.VigilThemeExtensions
import com.vigil.app.ui.viewmodel.VigilViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun TimelineScreen(
    viewModel: VigilViewModel,
    modifier: Modifier = Modifier
) {
    val selectedDate by viewModel.selectedDate.collectAsState()
    val daySummary by viewModel.daySummary.collectAsState()
    val activeActivities by viewModel.activeActivities.collectAsState()
    val allActivities by viewModel.allActivities.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val snackbarMessage by viewModel.snackbarMessage.collectAsState()

    var showAddEntryDialog by remember { mutableStateOf(false) }
    var intervalToEdit by remember { mutableStateOf<IntervalEntity?>(null) }
    var splitGapTarget by remember { mutableStateOf<TimelineBlock.Gap?>(null) }
    var customGapToLabel by remember { mutableStateOf<TimelineBlock.Gap?>(null) }

    val zoneId = ZoneId.systemDefault()
    val isToday = selectedDate == LocalDate.now()
    val timeFormatter = DateTimeFormatter.ofPattern("h:mm a").withZone(zoneId)
    val dateHeaderFormatter = DateTimeFormatter.ofPattern("EEE, MMM d, yyyy").withZone(zoneId)

    Surface(
        modifier = modifier.fillMaxSize(),
        color = VigilThemeExtensions.colors.canvas
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // Header Bar & Date Navigator
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { viewModel.previousDay() },
                        modifier = Modifier.testTag("timeline_prev_day_button")
                    ) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Day")
                    }

                    Column(modifier = Modifier.padding(horizontal = 4.dp)) {
                        Text(
                            text = if (isToday) "Today" else selectedDate.format(DateTimeFormatter.ofPattern("EEEE")),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = selectedDate.format(DateTimeFormatter.ofPattern("MMM d, yyyy")),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    IconButton(
                        onClick = { viewModel.nextDay() },
                        modifier = Modifier.testTag("timeline_next_day_button")
                    ) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Next Day")
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!isToday) {
                        OutlinedButton(
                            onClick = { viewModel.goToToday() },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.testTag("timeline_today_shortcut_button")
                        ) {
                            Text("Today", style = MaterialTheme.typography.labelMedium)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }

                    IconButton(
                        onClick = { showAddEntryDialog = true },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                            .size(36.dp)
                            .testTag("timeline_add_entry_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add Past Entry",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            // Day Balance Bar
            val summary = daySummary
            if (summary != null) {
                val totalElapsed = maxOf(summary.dayElapsedMs, 1L)
                val activeFraction = summary.totalActiveMs.toFloat() / totalElapsed
                val pauseFraction = summary.totalPauseMs.toFloat() / totalElapsed
                val sleepFraction = summary.totalSleepMs.toFloat() / totalElapsed
                val untrackedFraction = summary.totalUntrackedMs.toFloat() / totalElapsed

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 6.dp)
                ) {
                    // Segmented Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(5.dp))
                            .background(VigilThemeExtensions.colors.border)
                    ) {
                        if (activeFraction > 0f) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .weight(activeFraction)
                                    .background(MintAccent)
                            )
                        }
                        if (pauseFraction > 0f) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .weight(pauseFraction)
                                    .background(AmberAccent)
                            )
                        }
                        if (sleepFraction > 0f) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .weight(sleepFraction)
                                    .background(CategorySleep)
                            )
                        }
                        if (untrackedFraction > 0f) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .weight(untrackedFraction)
                                    .background(VigilThemeExtensions.colors.warmGapSurface)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Summary statistics
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${formatDuration(summary.totalActiveMs)} active",
                            style = MaterialTheme.typography.labelSmall,
                            color = MintAccent,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${formatDuration(summary.totalPauseMs)} pause",
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberAccent,
                            fontWeight = FontWeight.Medium
                        )
                        if (summary.totalSleepMs > 0) {
                            Text(
                                text = "${formatDuration(summary.totalSleepMs)} sleep",
                                style = MaterialTheme.typography.labelSmall,
                                color = CategorySleep,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Text(
                            text = "${formatDuration(summary.totalUntrackedMs)} untracked",
                            style = MaterialTheme.typography.labelSmall,
                            color = VigilThemeExtensions.colors.warmGapText,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Chronological Stream
            val blocks = summary?.blocks ?: emptyList()
            if (blocks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "No activity recorded for this day",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { showAddEntryDialog = true },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Add an entry")
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(blocks, key = { block ->
                        when (block) {
                            is TimelineBlock.Recorded -> block.interval.id
                            is TimelineBlock.Gap -> "gap_${block.startMs}_${block.endMs}"
                        }
                    }) { block ->
                        when (block) {
                            is TimelineBlock.Recorded -> {
                                val intv = block.interval
                                val act = block.activity
                                val cat = block.category
                                val startStr = timeFormatter.format(Instant.ofEpochMilli(block.displayStartMs))
                                val endStr = timeFormatter.format(Instant.ofEpochMilli(block.displayEndMs))
                                val durStr = formatDuration(block.displayDurationMs)

                                val catColor = try {
                                    if (cat?.colorHex != null) Color(android.graphics.Color.parseColor(cat.colorHex))
                                    else MintAccent
                                } catch (e: Exception) {
                                    MintAccent
                                }

                                val isPause = intv.kind == "pause"
                                val isSleep = intv.kind == "sleep"

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (isPause) VigilThemeExtensions.colors.warmGapSurface.copy(alpha = 0.5f) else VigilThemeExtensions.colors.surface)
                                        .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(16.dp))
                                        .clickable { intervalToEdit = intv }
                                        .padding(16.dp)
                                        .testTag("timeline_item_${intv.id}")
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            if (isPause) {
                                                Icon(
                                                    imageVector = Icons.Default.PauseCircle,
                                                    contentDescription = null,
                                                    tint = AmberAccent,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            } else {
                                                Box(
                                                    modifier = Modifier
                                                        .size(12.dp)
                                                        .clip(CircleShape)
                                                        .background(if (isSleep) CategorySleep else catColor)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(12.dp))

                                            Column {
                                                Text(
                                                    text = when {
                                                        isPause -> "Paused${if (!intv.reason.isNullOrBlank()) " • ${intv.reason}" else ""}"
                                                        isSleep -> "Sleep"
                                                        else -> act?.name ?: "Activity"
                                                    },
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = MaterialTheme.colorScheme.onSurface
                                                )
                                                Text(
                                                    text = "$startStr – $endStr",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = durStr,
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.SemiBold,
                                                color = when {
                                                    isPause -> AmberAccent
                                                    isSleep -> CategorySleep
                                                    else -> MintAccent
                                                }
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Icon(
                                                imageVector = Icons.Default.Edit,
                                                contentDescription = "Edit entry",
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }
                            }
                            is TimelineBlock.Gap -> {
                                val gapMinutes = block.durationMs / 60_000L
                                val startStr = timeFormatter.format(Instant.ofEpochMilli(block.startMs))
                                val endStr = timeFormatter.format(Instant.ofEpochMilli(block.endMs))

                                GapCard(
                                    gapDurationFormatted = "${gapMinutes}m",
                                    timeRangeFormatted = "$startStr – $endStr",
                                    quickActivities = activeActivities,
                                    onLabelGap = { actId ->
                                        viewModel.labelGap(block.startMs, block.endMs, actId)
                                    },
                                    onSplitGapClick = { splitGapTarget = block },
                                    onCustomLabelClick = { customGapToLabel = block }
                                )
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(100.dp)) // Extra clearance for navigation bar
                    }
                }
            }
        }

        // Snackbar presentation
        if (snackbarMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 90.dp, start = 16.dp, end = 16.dp),
                contentAlignment = Alignment.BottomCenter
            ) {
                Snackbar(
                    action = {
                        Text(
                            text = "Dismiss",
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable { viewModel.clearSnackbar() }
                        )
                    }
                ) {
                    Text(snackbarMessage ?: "")
                }
            }
        }
    }

    // Dialogs
    if (showAddEntryDialog) {
        ManualEntryDialog(
            defaultDate = selectedDate,
            activities = activeActivities,
            onSave = { start, end, actId, reason ->
                viewModel.addManualEntry(start, end, actId, reason)
                showAddEntryDialog = false
            },
            onDismiss = { showAddEntryDialog = false }
        )
    }

    if (intervalToEdit != null) {
        val intv = intervalToEdit!!
        ManualEntryDialog(
            existingInterval = intv,
            defaultDate = selectedDate,
            activities = allActivities,
            onSave = { start, end, actId, reason ->
                viewModel.editInterval(intv.id, start, end, actId, reason)
                intervalToEdit = null
            },
            onDelete = {
                viewModel.deleteInterval(intv.id)
                intervalToEdit = null
            },
            onDismiss = { intervalToEdit = null }
        )
    }

    if (splitGapTarget != null) {
        val gap = splitGapTarget!!
        SplitGapDialog(
            startInstant = gap.startMs,
            endInstant = gap.endMs,
            activities = activeActivities,
            onConfirmSplit = { splitInstant, act1, act2 ->
                viewModel.splitGap(gap.startMs, splitInstant, gap.endMs, act1, act2)
                splitGapTarget = null
            },
            onDismiss = { splitGapTarget = null }
        )
    }

    if (customGapToLabel != null) {
        val gap = customGapToLabel!!
        ActivityPickerSheet(
            activities = activeActivities,
            categories = categories,
            onSelectActivity = { act ->
                viewModel.labelGap(gap.startMs, gap.endMs, act.id)
                customGapToLabel = null
            },
            onCreateActivity = { name, catId ->
                viewModel.createActivity(name, catId)
            },
            onDismiss = { customGapToLabel = null }
        )
    }
}

private fun formatDuration(durationMs: Long): String {
    val totalSeconds = durationMs / 1000L
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    return when {
        hours > 0 && minutes > 0 -> "${hours}h ${minutes}m"
        hours > 0 -> "${hours}h"
        else -> "${minutes}m"
    }
}
