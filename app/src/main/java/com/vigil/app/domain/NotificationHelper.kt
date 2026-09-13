package com.vigil.app.domain

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.vigil.app.MainActivity
import com.vigil.app.data.model.SettingsEntity
import java.time.LocalTime
import java.time.format.DateTimeFormatter

class NotificationHelper(private val context: Context) {

    companion object {
        const val CHANNEL_ID_CHECKINS = "vigil_checkins"
        const val CHANNEL_NAME_CHECKINS = "VIGIL Gentle Check-ins"
        const val NOTIFICATION_ID_PAUSE = 1001
        const val NOTIFICATION_ID_IDLE = 1002
        const val NOTIFICATION_ID_TEST = 1003
        const val NOTIFICATION_ID_TARGET = 1004

        fun createNotificationChannels(context: Context) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val channel = NotificationChannel(
                        CHANNEL_ID_CHECKINS,
                        CHANNEL_NAME_CHECKINS,
                        NotificationManager.IMPORTANCE_DEFAULT
                    ).apply {
                        description = "Gentle check-ins during long pauses or untracked intervals"
                        enableVibration(true)
                    }
                    val manager = context.getSystemService(NotificationManager::class.java)
                    manager?.createNotificationChannel(channel)
                }
            } catch (_: Exception) {
                // Ignore failure on restricted or test environments
            }
        }

        fun isQuietHours(settings: SettingsEntity): Boolean {
            try {
                val formatter = DateTimeFormatter.ofPattern("HH:mm")
                val start = LocalTime.parse(settings.quietHoursStart, formatter)
                val end = LocalTime.parse(settings.quietHoursEnd, formatter)
                val now = LocalTime.now()

                return if (start.isBefore(end)) {
                    now.isAfter(start) && now.isBefore(end)
                } else {
                    now.isAfter(start) || now.isBefore(end)
                }
            } catch (e: Exception) {
                return false
            }
        }
    }

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    init {
        createNotificationChannels(context)
    }

    fun cancelAllReminders() {
        notificationManager.cancel(NOTIFICATION_ID_PAUSE)
        notificationManager.cancel(NOTIFICATION_ID_IDLE)
        notificationManager.cancel(NOTIFICATION_ID_TARGET)
    }

    fun showPauseReminder(activityName: String?, settings: SettingsEntity) {
        if (!settings.remindersEnabled || isQuietHours(settings)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (settings.privateLockScreenPreview) "VIGIL • Session Paused" else "VIGIL • ${activityName ?: "Activity"} Paused"
        val content = if (settings.privateLockScreenPreview) "Check in on your paused session" else "You've been paused. Resume or wrap up?"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_CHECKINS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        notificationManager.notify(NOTIFICATION_ID_PAUSE, builder.build())
    }

    fun showTestNotification(settings: SettingsEntity) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (settings.privateLockScreenPreview) "VIGIL • Check-in" else "VIGIL • Test Reminder"
        val content = if (settings.privateLockScreenPreview) "Gentle reminder to check your timeline" else "Notifications and quiet hours are configured properly."

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_CHECKINS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        notificationManager.notify(NOTIFICATION_ID_TEST, builder.build())
    }

    fun showTargetReachedReminder(activityName: String?, settings: SettingsEntity) {
        if (!settings.remindersEnabled || isQuietHours(settings)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (settings.privateLockScreenPreview) "VIGIL • Focus Target Reached" else "VIGIL • Target Reached: ${activityName ?: "Deep Work"}"
        val content = if (settings.privateLockScreenPreview) "Your focus session target has been reached." else "Great focus! Wrap up your session or continue in flow."

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_CHECKINS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        notificationManager.notify(NOTIFICATION_ID_TARGET, builder.build())
    }
}
