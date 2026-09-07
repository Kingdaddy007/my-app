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

object NotificationHelper {

    const val CHANNEL_ID_CHECKINS = "vigil_checkins"
    const val CHANNEL_NAME_CHECKINS = "VIGIL Gentle Check-ins"

    fun createNotificationChannels(context: Context) {
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

    fun showTestNotification(context: Context, settings: SettingsEntity) {
        createNotificationChannels(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (settings.privateLockScreenPreview) "VIGIL • Check-in" else "VIGIL • Still studying?"
        val content = if (settings.privateLockScreenPreview) "Gentle reminder to check your timeline" else "You've been paused for 10 minutes. Resume or finish your session?"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID_CHECKINS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        manager.notify(1001, builder.build())
    }
}
