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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.vigil.app.data.model.PriorityEntity
import com.vigil.app.ui.theme.VigilThemeExtensions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrioritySheet(
    dateLabel: String,
    existingPriorities: List<PriorityEntity>,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onSavePriorities: (List<String>) -> Unit,
    onTogglePriority: ((priorityId: String) -> Unit)? = null
) {
    var p1 by remember(existingPriorities) { mutableStateOf(existingPriorities.getOrNull(0)?.title ?: "") }
    var p2 by remember(existingPriorities) { mutableStateOf(existingPriorities.getOrNull(1)?.title ?: "") }
    var p3 by remember(existingPriorities) { mutableStateOf(existingPriorities.getOrNull(2)?.title ?: "") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = VigilThemeExtensions.colors.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
        ) {
            Text(
                text = "Priorities for $dateLabel",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Keep it to at most three essential intentions.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Priority 1
            OutlinedTextField(
                value = p1,
                onValueChange = { p1 = it },
                label = { Text("Priority 1 (Primary)") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_priority_1")
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Priority 2
            OutlinedTextField(
                value = p2,
                onValueChange = { p2 = it },
                label = { Text("Priority 2 (Secondary)") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_priority_2")
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Priority 3
            OutlinedTextField(
                value = p3,
                onValueChange = { p3 = it },
                label = { Text("Priority 3 (Tertiary)") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("input_priority_3")
            )

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Cancel")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = {
                        val list = listOf(p1, p2, p3).filter { it.isNotBlank() }
                        onSavePriorities(list)
                        onDismiss()
                    },
                    modifier = Modifier.testTag("btn_save_priorities")
                ) {
                    Text("Save Intentions")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
