@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.vigil.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.ui.theme.VigilThemeExtensions
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SplitGapDialog(
    startMs: Long,
    endMs: Long,
    activities: List<ActivityEntity>,
    onDismiss: () -> Unit,
    onConfirmSplit: (splitInstant: Long, activityId1: String, activityId2: String) -> Unit
) {
    val durationMs = endMs - startMs
    var sliderFraction by remember { mutableFloatStateOf(0.5f) }
    var selectedActivityId1 by remember { mutableStateOf(activities.firstOrNull()?.id ?: "") }
    var selectedActivityId2 by remember { mutableStateOf(activities.getOrNull(1)?.id ?: activities.firstOrNull()?.id ?: "") }

    val zone = ZoneId.systemDefault()
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    val splitMs = startMs + (durationMs * sliderFraction).toLong()
    val part1Minutes = ((splitMs - startMs) / 60_000L).coerceAtLeast(1)
    val part2Minutes = ((endMs - splitMs) / 60_000L).coerceAtLeast(1)

    val startStr = Instant.ofEpochMilli(startMs).atZone(zone).format(timeFormatter)
    val splitStr = Instant.ofEpochMilli(splitMs).atZone(zone).format(timeFormatter)
    val endStr = Instant.ofEpochMilli(endMs).atZone(zone).format(timeFormatter)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Split Gap") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = "Total gap: $startStr – $endStr (${durationMs / 60_000L}m)",
                    style = MaterialTheme.typography.bodyMedium
                )

                // Slider for division
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Part 1: ${part1Minutes}m", style = MaterialTheme.typography.labelMedium)
                        Text("At $splitStr", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        Text("Part 2: ${part2Minutes}m", style = MaterialTheme.typography.labelMedium)
                    }

                    Slider(
                        value = sliderFraction,
                        onValueChange = { sliderFraction = it.coerceIn(0.05f, 0.95f) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("slider_split_gap")
                    )
                }

                // Activity 1 selection
                Text("Activity for Part 1 ($startStr – $splitStr):", style = MaterialTheme.typography.labelSmall)
                androidx.compose.foundation.layout.FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    activities.take(6).forEach { act ->
                        val isSelected = act.id == selectedActivityId1
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.raisedSurface)
                                .clickable { selectedActivityId1 = act.id }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = act.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }

                // Activity 2 selection
                Text("Activity for Part 2 ($splitStr – $endStr):", style = MaterialTheme.typography.labelSmall)
                androidx.compose.foundation.layout.FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    activities.take(6).forEach { act ->
                        val isSelected = act.id == selectedActivityId2
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.raisedSurface)
                                .clickable { selectedActivityId2 = act.id }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = act.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onConfirmSplit(splitMs, selectedActivityId1, selectedActivityId2)
                    onDismiss()
                },
                modifier = Modifier.testTag("btn_confirm_split")
            ) {
                Text("Apply Split")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
