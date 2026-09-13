package com.vigil.app.ui.screens.review

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.HourglassBottom
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vigil.app.ui.components.PrioritySheet
import com.vigil.app.ui.theme.AmberAccent
import com.vigil.app.ui.theme.MintAccent
import com.vigil.app.ui.theme.VigilThemeExtensions
import com.vigil.app.ui.viewmodel.VigilViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReviewScreen(
    viewModel: VigilViewModel,
    modifier: Modifier = Modifier
) {
    val isWeekly by viewModel.isWeeklyReview.collectAsState()
    val stats by viewModel.reviewStats.collectAsState()
    val tomorrowPriorities by viewModel.tomorrowPriorities.collectAsState()

    var showTomorrowPriorityEditor by remember { mutableStateOf(false) }
    val prioritySheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    Surface(
        modifier = modifier.fillMaxSize(),
        color = VigilThemeExtensions.colors.canvas
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 100.dp) // Clearance for bottom nav
        ) {
            // Header Bar
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Text(
                    text = "Review",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Transparent accounting. No arbitrary scores or fake trends.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Daily / Weekly Toggle
            TabRow(
                selectedTabIndex = if (isWeekly) 1 else 0,
                containerColor = VigilThemeExtensions.colors.surface,
                contentColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(16.dp))
            ) {
                Tab(
                    selected = !isWeekly,
                    onClick = { viewModel.setWeeklyReview(false) },
                    text = { Text("Daily", fontWeight = if (!isWeekly) FontWeight.Bold else FontWeight.Normal) },
                    modifier = Modifier.testTag("review_daily_tab")
                )
                Tab(
                    selected = isWeekly,
                    onClick = { viewModel.setWeeklyReview(true) },
                    text = { Text("7-Day Window", fontWeight = if (isWeekly) FontWeight.Bold else FontWeight.Normal) },
                    modifier = Modifier.testTag("review_weekly_tab")
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Range indicator
            val currentStats = stats
            if (currentStats != null) {
                Text(
                    text = currentStats.dateRangeText,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // 2x2 Metric Cards Grid
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        MetricCard(
                            title = "Total Recorded",
                            value = formatDuration(currentStats.totalRecordedMs),
                            subtitle = if (isWeekly) "Across ${currentStats.daysWithDataCount} days" else "Accounted time",
                            icon = Icons.Default.HourglassBottom,
                            accentColor = MintAccent,
                            modifier = Modifier.weight(1f)
                        )
                        MetricCard(
                            title = "Longest Streak",
                            value = formatDuration(currentStats.longestUninterruptedMs),
                            subtitle = "Uninterrupted focus",
                            icon = Icons.Default.FlashOn,
                            accentColor = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        MetricCard(
                            title = "Pauses & Breaks",
                            value = formatDuration(currentStats.totalPauseMs),
                            subtitle = "${currentStats.interruptionCount} interruptions",
                            icon = Icons.Default.PauseCircle,
                            accentColor = AmberAccent,
                            modifier = Modifier.weight(1f)
                        )
                        MetricCard(
                            title = "Average Session",
                            value = formatDuration(currentStats.averageSessionMs),
                            subtitle = "Per recorded block",
                            icon = Icons.Default.Assessment,
                            accentColor = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Category Breakdown Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(VigilThemeExtensions.colors.surface)
                        .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(20.dp))
                        .padding(18.dp)
                ) {
                    Column {
                        Text(
                            text = "Category Distribution",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        if (currentStats.categoryBreakdowns.isEmpty()) {
                            Text(
                                text = "No category data recorded for this window.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else {
                            // Proportional Bar
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(12.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(VigilThemeExtensions.colors.border)
                            ) {
                                currentStats.categoryBreakdowns.forEach { breakdown ->
                                    val catColor = try {
                                        Color(android.graphics.Color.parseColor(breakdown.category.colorHex))
                                    } catch (e: Exception) {
                                        MintAccent
                                    }
                                    if (breakdown.percentage > 0.01f) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxHeight()
                                                .weight(breakdown.percentage)
                                                .background(catColor)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Itemized Breakdown Rows
                            currentStats.categoryBreakdowns.forEach { breakdown ->
                                val catColor = try {
                                    Color(android.graphics.Color.parseColor(breakdown.category.colorHex))
                                } catch (e: Exception) {
                                    MintAccent
                                }
                                val percentInt = (breakdown.percentage * 100).toInt()

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(10.dp)
                                                .clip(CircleShape)
                                                .background(catColor)
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text(
                                            text = breakdown.category.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = formatDuration(breakdown.durationMs),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "$percentInt%",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Tomorrow's Priorities Planning Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(VigilThemeExtensions.colors.surface)
                        .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(20.dp))
                        .padding(18.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Tomorrow's 3 Priorities",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "Plan the night before for calm direction.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable { showTomorrowPriorityEditor = true }
                                    .padding(8.dp)
                                    .testTag("edit_tomorrow_priorities_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit Tomorrow's Priorities",
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (tomorrowPriorities.isEmpty()) {
                            Text(
                                text = "No priorities set yet. Take a moment to set tomorrow's top 3 intentions.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else {
                            tomorrowPriorities.forEachIndexed { index, priority ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(22.dp)
                                            .clip(CircleShape)
                                            .background(VigilThemeExtensions.colors.raisedSurface)
                                            .border(1.dp, VigilThemeExtensions.colors.border, CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "${index + 1}",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = priority.title,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showTomorrowPriorityEditor) {
        PrioritySheet(
            dateLabel = "Tomorrow",
            existingPriorities = tomorrowPriorities,
            sheetState = prioritySheetState,
            onDismiss = { showTomorrowPriorityEditor = false },
            onSavePriorities = { list ->
                viewModel.setTomorrowPriorities(list)
                showTomorrowPriorityEditor = false
            }
        )
    }
}

@Composable
private fun MetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(VigilThemeExtensions.colors.surface)
            .border(1.dp, VigilThemeExtensions.colors.border, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(18.dp)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
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
