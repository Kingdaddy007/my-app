import { Platform } from 'react-native';
import { UserSettings } from '../domain/types';
import { isInQuietHours } from '../domain/quietHours';

export { isInQuietHours };

let isNotificationsConfigured = false;

/**
 * Configure notification handler to show banners/sounds when app is in foreground
 */
export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'web' || isNotificationsConfigured) return;

  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vigil_checkins', {
        name: 'VIGIL Check-ins',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#55DEAE',
      });
    }

    isNotificationsConfigured = true;
  } catch {
    // Graceful fallback
  }
}

/**
 * Request notification permissions explicitly
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const Notifications = await import('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Cancel all pending scheduled check-in notifications
 */
export async function cancelAllScheduledReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore error
  }
}

/**
 * Schedule pause check-in reminder (e.g. 10 minutes)
 */
export async function schedulePauseReminder(
  settings: UserSettings,
  activityName?: string
): Promise<string | null> {
  if (!settings.remindersEnabled || Platform.OS === 'web') return null;

  try {
    await configureNotifications();
    await cancelAllScheduledReminders();

    const targetDate = new Date(Date.now() + settings.pauseReminderMinutes * 60 * 1000);

    // Suppress if inside quiet hours
    if (isInQuietHours(targetDate, settings.quietHoursStart, settings.quietHoursEnd)) {
      return null;
    }

    const title = 'VIGIL Check-in';
    const body = settings.privacyMode
      ? 'Still taking a break? Resume when you are ready.'
      : activityName
      ? `Paused ${activityName}. Ready to resume?`
      : 'Still taking a break? Resume when you are ready.';

    const Notifications = await import('expo-notifications');
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { action: 'resume_checkin' },
        channelId: 'vigil_checkins',
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: settings.pauseReminderMinutes * 60,
      },
    });

    return id;
  } catch {
    return null;
  }
}

/**
 * Schedule idle check-in reminder (e.g. 30 minutes while awake)
 */
export async function scheduleIdleReminder(
  settings: UserSettings
): Promise<string | null> {
  if (!settings.remindersEnabled || Platform.OS === 'web') return null;

  try {
    await configureNotifications();
    await cancelAllScheduledReminders();

    const targetDate = new Date(Date.now() + settings.idleReminderMinutes * 60 * 1000);

    // Suppress if inside quiet hours
    if (isInQuietHours(targetDate, settings.quietHoursStart, settings.quietHoursEnd)) {
      return null;
    }

    const title = 'VIGIL Check-in';
    const body = 'A little time is unaccounted for. Want to give it a name?';

    const Notifications = await import('expo-notifications');
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { action: 'idle_checkin' },
        channelId: 'vigil_checkins',
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: settings.idleReminderMinutes * 60,
      },
    });

    return id;
  } catch {
    return null;
  }
}

/**
 * Trigger an immediate test reminder for user confirmation in Settings
 */
export async function sendTestReminder(settings: UserSettings): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    await configureNotifications();
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'VIGIL Test Reminder',
        body: settings.privacyMode
          ? 'Notifications are configured and working privately.'
          : 'Notifications are configured. Activity names will be displayed.',
        channelId: 'vigil_checkins',
      } as any,
      trigger: null, // Immediate
    });
    return true;
  } catch {
    return false;
  }
}
