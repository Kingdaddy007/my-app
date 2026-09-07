package com.vigil.app.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val colorHex: String,
    val iconKey: String = "category",
    val sortOrder: Int = 0
)

@Entity(
    tableName = "activities",
    indices = [Index(value = ["categoryId"])]
)
data class ActivityEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val categoryId: String,
    val iconKey: String = "circle",
    val isFavorite: Boolean = false,
    val isArchived: Boolean = false,
    val targetSeconds: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "sessions",
    indices = [Index(value = ["activityId"]), Index(value = ["status"])]
)
data class SessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val activityId: String,
    val status: String, // "running", "paused", "completed"
    val startedAt: Long,
    val endedAt: Long? = null,
    val targetSeconds: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "intervals",
    indices = [
        Index(value = ["sessionId"]),
        Index(value = ["activityId"]),
        Index(value = ["startInstant"]),
        Index(value = ["endInstant"])
    ]
)
data class IntervalEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val sessionId: String? = null,
    val activityId: String? = null,
    val kind: String, // "active", "pause", "manual", "sleep"
    val startInstant: Long,
    val endInstant: Long? = null, // null if open
    val reason: String? = null, // e.g. "Break", "Phone call", "Distraction", "Other", "Skip"
    val revision: Int = 1
)

@Entity(
    tableName = "wake_markers",
    indices = [Index(value = ["date"], unique = true)]
)
data class WakeMarkerEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val date: String, // YYYY-MM-DD
    val wakeInstant: Long,
    val source: String = "manual"
)

@Entity(
    tableName = "priorities",
    indices = [Index(value = ["localDate"])]
)
data class PriorityEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val localDate: String, // YYYY-MM-DD
    val title: String,
    val sortOrder: Int, // 0, 1, 2
    val activityId: String? = null,
    val completedAt: Long? = null
)

@Entity(tableName = "settings")
data class SettingsEntity(
    @PrimaryKey val id: Int = 1,
    val hasCompletedOnboarding: Boolean = false,
    val displayName: String = "",
    val themePreference: String = "system", // "system", "light", "dark"
    val timeFormat: String = "system", // "system", "12h", "24h"
    val remindersEnabled: Boolean = false,
    val pauseReminderMinutes: Int = 10,
    val idleReminderMinutes: Int = 30,
    val quietHoursStart: String = "22:00",
    val quietHoursEnd: String = "07:00",
    val suppressRemindersDuringSleep: Boolean = true,
    val privateLockScreenPreview: Boolean = true,
    val hapticsEnabled: Boolean = true,
    val reducedMotionEnabled: Boolean = false
)
