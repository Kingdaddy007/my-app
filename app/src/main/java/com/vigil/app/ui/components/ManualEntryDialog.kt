package com.vigil.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.data.model.IntervalEntity
import com.vigil.app.ui.theme.VigilThemeExtensions
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun ManualEntryDialog(
    initialDateInstant: Long,
    editingInterval: IntervalEntity? = null,
    activities: List<ActivityEntity>,
    onDismiss: () -> Unit,
    onSave: (startInstant: Long, endInstant: Long, activityId: String, reason: String?) -> Unit,
    onDelete: ((intervalId: String) -> Unit)? = null
) {
    val zone = ZoneId.systemDefault()
    val formatter = DateTimeFormatter.ofPattern("HH:mm")

    val initialStartLocal = remember {
        if (editingInterval != null) {
            Instant.ofEpochMilli(editingInterval.startInstant).atZone(zone).toLocalTime()
        } else {
            Instant.ofEpochMilli(initialDateInstant).atZone(zone).toLocalTime().minusHours(1)
        }
    }
    val initialEndLocal = remember {
        if (editingInterval != null && editingInterval.endInstant != null) {
            Instant.ofEpochMilli(editingInterval.endInstant).atZone(zone).toLocalTime()
        } else {
            Instant.ofEpochMilli(initialDateInstant).atZone(zone).toLocalTime()
        }
    }

    var startTimeText by remember { mutableStateOf(initialStartLocal.format(formatter)) }
    var endTimeText by remember { mutableStateOf(initialEndLocal.format(formatter)) }
    var selectedActivityId by remember {
        mutableStateOf(editingInterval?.activityId ?: activities.firstOrNull()?.id ?: "")
    }
    var reasonText by remember { mutableStateOf(editingInterval?.reason ?: "") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editingInterval == null) "Add Historical Entry" else "Edit Timeline Entry") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (errorMessage != null) {
                    Text(
                        text = errorMessage ?: "",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = startTimeText,
                        onValueChange = { startTimeText = it; errorMessage = null },
                        label = { Text("Start (HH:mm)") },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("input_manual_start_time")
                    )
                    OutlinedTextField(
                        value = endTimeText,
                        onValueChange = { endTimeText = it; errorMessage = null },
                        label = { Text("End (HH:mm)") },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("input_manual_end_time")
                    )
                }

                Text("Activity:", style = MaterialTheme.typography.labelSmall)

                androidx.compose.foundation.layout.FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    activities.forEach { act ->
                        val isSelected = act.id == selectedActivityId
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) MaterialTheme.colorScheme.primary else VigilThemeExtensions.colors.raisedSurface)
                                .clickable { selectedActivityId = act.id }
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

                OutlinedTextField(
                    value = reasonText,
                    onValueChange = { reasonText = it },
                    label = { Text("Optional Note / Reason") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                if (editingInterval != null && onDelete != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = { showDeleteConfirm = true },
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.testTag("btn_delete_interval")
                    ) {
                        Text("Delete this entry")
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    try {
                        val startLt = LocalTime.parse(startTimeText.trim(), formatter)
                        val endLt = LocalTime.parse(endTimeText.trim(), formatter)

                        val baseLocalDate = Instant.ofEpochMilli(initialDateInstant).atZone(zone).toLocalDate()
                        val startInstant = baseLocalDate.atTime(startLt).atZone(zone).toInstant().toEpochMilli()
                        val endInstant = baseLocalDate.atTime(endLt).atZone(zone).toInstant().toEpochMilli()

                        if (endInstant <= startInstant) {
                            errorMessage = "End time must be after start time"
                            return@Button
                        }
                        if (selectedActivityId.isBlank()) {
                            errorMessage = "Please select an activity"
                            return@Button
                        }

                        onSave(startInstant, endInstant, selectedActivityId, reasonText.ifBlank { null })
                        onDismiss()
                    } catch (e: Exception) {
                        errorMessage = "Invalid time format. Please use HH:mm (e.g. 14:30)"
                    }
                },
                modifier = Modifier.testTag("btn_save_manual_entry")
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )

    if (showDeleteConfirm && editingInterval != null && onDelete != null) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Entry") },
            text = { Text("Are you sure you want to remove this record? This interval will become untracked time.") },
            confirmButton = {
                Button(
                    onClick = {
                        onDelete(editingInterval.id)
                        showDeleteConfirm = false
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
