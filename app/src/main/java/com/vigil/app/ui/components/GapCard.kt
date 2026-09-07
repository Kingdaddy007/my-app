package com.vigil.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CallSplit
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.ui.theme.VigilThemeExtensions
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GapCard(
    startMs: Long,
    endMs: Long,
    durationMs: Long,
    activities: List<ActivityEntity>,
    onLabelWholeGap: (ActivityEntity) -> Unit,
    onSplitGap: () -> Unit,
    modifier: Modifier = Modifier
) {
    val durationMinutes = durationMs / 60_000L
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")
    val zone = ZoneId.systemDefault()
    val startStr = Instant.ofEpochMilli(startMs).atZone(zone).format(timeFormatter)
    val endStr = Instant.ofEpochMilli(endMs).atZone(zone).format(timeFormatter)

    val warmColors = VigilThemeExtensions.colors

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(warmColors.warmGapSurface)
            .border(
                width = 1.dp,
                color = warmColors.warmGapText.copy(alpha = 0.35f),
                shape = RoundedCornerShape(16.dp)
            )
            .padding(16.dp)
            .testTag("gap_card_${startMs}")
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.HelpOutline,
                        contentDescription = "Unaccounted gap",
                        tint = warmColors.warmGapText,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Unaccounted gap: ${durationMinutes}m",
                        style = MaterialTheme.typography.titleSmall,
                        color = warmColors.warmGapText
                    )
                }

                Text(
                    text = "$startStr – $endStr",
                    style = MaterialTheme.typography.labelSmall,
                    color = warmColors.warmGapText.copy(alpha = 0.8f)
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Give this interval a name, or leave it as untracked rest.",
                style = MaterialTheme.typography.bodySmall,
                color = warmColors.warmGapText.copy(alpha = 0.85f)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Quick label activity chips
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                activities.take(6).forEach { activity ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(warmColors.surface.copy(alpha = 0.85f))
                            .border(
                                width = 1.dp,
                                color = warmColors.warmGapText.copy(alpha = 0.3f),
                                shape = RoundedCornerShape(20.dp)
                            )
                            .clickable { onLabelWholeGap(activity) }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                            .testTag("chip_label_${activity.name.lowercase()}")
                    ) {
                        Text(
                            text = activity.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                OutlinedButton(
                    onClick = onSplitGap,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = warmColors.warmGapText
                    ),
                    modifier = Modifier.testTag("button_split_gap")
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CallSplit,
                        contentDescription = "Split gap",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Split or edit", style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}
