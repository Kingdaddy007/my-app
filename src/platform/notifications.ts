import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { UserSettings } from '../domain/types';
import { isInQuietHours } from '../domain/quietHours';
import {
  canDeliverReminder,
  createReminderTapHandler,
  decideReminderSchedule,
  localDayKey,
  nextDeliveryRecord,
  REMINDER_POLICY,
  ReminderDeliveryRecord,
} from '../domain/reminderPolicy';

export {
  isInQuietHours,
  canDeliverReminder,
  nextDeliveryRecord,
  localDayKey,
  REMINDER_POLICY,
  decideReminderSchedule,
  createReminderTapHandler,
};
export type { ReminderDeliveryRecord };

let isNotificationsConfigured = false;
let notificationTapListenerRegistered = false;

/**
 * Expo Go no longer includes Android remote-push support. Importing the
 * notifications package there can throw before the app renders, so keep all
 * notification-module access behind this runtime boundary. Local scheduling
 * remains available to the native development build.
 */
function notificationsUnavailable(): boolean {
  return Platform.OS === 'web' || isRunningInExpoGo();
}

export type ReminderKind = 'pause' | 'idle' | 'focus-target' | 'snoozed';

/**
 * Configure notification handler to show banners/sounds when app is in foreground
 */
export async function configureNotifications(): Promise<void> {
  if (notificationsUnavailable() || isNotificationsConfigured) return;

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
        name: 'AEVIA Check-ins',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#91A7FF',
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
  if (notificationsUnavailable()) return false;
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

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'> {
  if (notificationsUnavailable()) return 'unavailable';
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * Cancel all pending scheduled check-in notifications
 */
export async function cancelAllScheduledReminders(
  settings?: UserSettings,
  persistSettings?: (partial: Partial<UserSettings>) => Promise<void>
): Promise<void> {
  if (notificationsUnavailable()) return;
  try {
    const Notifications = await import('expo-notifications');
    const record = settings ? readDeliveryRecord(settings) : null;
    const scheduled = record ? await Notifications.getAllScheduledNotificationsAsync() : [];
    const pendingIds = new Set(scheduled.map((item) => item.identifier));
    const releasedCount = record
      ? record.scheduledIds.filter((id) => pendingIds.has(id)).length
      : 0;
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (record && persistSettings) {
      const countToday = Math.max(0, record.countToday - releasedCount);
      await persistDelivery(persistSettings, {
        ...record,
        countToday,
        lastScheduledAtMs: countToday === 0 ? 0 : record.lastScheduledAtMs,
        scheduledIds: [],
      });
    }
  } catch {
    // Ignore error
  }
}

export async function cancelScheduledReminderById(id: string): Promise<void> {
  if (notificationsUnavailable()) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ignore error
  }
}

function readDeliveryRecord(settings: UserSettings): ReminderDeliveryRecord {
  const raw = (settings as unknown as Record<string, unknown>).__reminderDelivery;
  if (raw && typeof raw === 'object') {
    const rec = raw as Partial<ReminderDeliveryRecord>;
    if (typeof rec.dayKey === 'string' && typeof rec.countToday === 'number') {
      return {
        dayKey: rec.dayKey,
        countToday: rec.countToday,
        lastScheduledAtMs: typeof rec.lastScheduledAtMs === 'number' ? rec.lastScheduledAtMs : 0,
        lastDeliveredAtMs: typeof rec.lastDeliveredAtMs === 'number' ? rec.lastDeliveredAtMs : undefined,
        scheduledIds: Array.isArray(rec.scheduledIds) ? rec.scheduledIds.filter((x): x is string => typeof x === 'string') : [],
      };
    }
  }
  return { dayKey: localDayKey(Date.now()), countToday: 0, lastScheduledAtMs: 0, scheduledIds: [] };
}

/**
 * Best-effort query of which tracked IDs are still pending with the OS.
 * Unknown (web, errors) yields an empty list so callers treat the schedule
 * as new rather than assuming a replacement.
 */
async function pendingTrackedIds(trackedIds: string[]): Promise<string[]> {
  if (notificationsUnavailable() || trackedIds.length === 0) return [];
  try {
    const Notifications = await import('expo-notifications');
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const pending = new Set(scheduled.map((n) => n.identifier));
    return trackedIds.filter((id) => pending.has(id));
  } catch {
    return [];
  }
}

/**
 * Pure policy check used by domain tests and scheduling: at most one
 * proactive reminder per hour and four per local day.
 * (Implementation lives in domain/reminderPolicy; re-exported above.)
 */

async function persistDelivery(
  persist: ((partial: Partial<UserSettings>) => Promise<void>) | undefined,
  record: ReminderDeliveryRecord
): Promise<void> {
  if (!persist) return;
  try {
    await persist({ __reminderDelivery: record } as unknown as Partial<UserSettings>);
  } catch {
    // Scheduling success must never roll back; delivery counts are best-effort.
  }
}

type ScheduleInput = {
  settings: UserSettings;
  kind: ReminderKind;
  title: string;
  body: string;
  secondsFromNow: number;
  data?: Record<string, unknown>;
  /** When true, a quiet-hours hit reschedules just after quiet hours end instead of dropping. */
  rescheduleAfterQuietHours?: boolean;
  persistSettings?: (partial: Partial<UserSettings>) => Promise<void>;
  isSleeping?: boolean;
};

/**
 * Single bounded scheduling path: quiet-hours + sleep suppression + hourly /
 * daily caps + persisted schedule record. Ordering guarantees:
 * 1. caps are evaluated BEFORE anything is cancelled;
 * 2. still-pending tracked reminders are replaced (cancelled after the new
 *    schedule succeeds) without consuming quota;
 * 3. quota is recorded only after a successful schedule.
 * Never throws; returns null when suppressed so callers render honest status.
 */
export async function scheduleBoundedReminder(input: ScheduleInput): Promise<string | null> {
  const { settings, kind, title, body, secondsFromNow, data, rescheduleAfterQuietHours = true, persistSettings, isSleeping = false } = input;
  if (!settings.remindersEnabled || notificationsUnavailable()) return null;
  if (!Number.isFinite(secondsFromNow) || secondsFromNow <= 0) return null;
  if (isSleeping && kind !== 'focus-target') return null;

  try {
    await configureNotifications();
    const record = readDeliveryRecord(settings);
    const nowMs = Date.now();

    // Evaluate caps before touching any existing schedule.
    const stillPending = await pendingTrackedIds(record.scheduledIds);
    const decision = decideReminderSchedule(nowMs, record, stillPending);
    if (decision.action === 'deny') return null;

    let fireAtMs = nowMs + secondsFromNow * 1000;
    if (isInQuietHours(new Date(fireAtMs), settings.quietHoursStart, settings.quietHoursEnd)) {
      if (!rescheduleAfterQuietHours) return null;
      const afterQuiet = nextTimeOutsideQuietHours(new Date(fireAtMs), settings.quietHoursStart, settings.quietHoursEnd);
      if (!afterQuiet) return null;
      fireAtMs = afterQuiet.getTime();
      // A reschedule far beyond the cap window is still exactly one delivery.
      if (fireAtMs - nowMs > 12 * 60 * 60 * 1000) return null;
    }

    const Notifications = await import('expo-notifications');
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { action: kind === 'pause' ? 'resume_checkin' : kind === 'idle' ? 'idle_checkin' : kind, kind, fireAtMs, ...data },
        channelId: 'vigil_checkins',
      } as unknown as Record<string, unknown> as never,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round((fireAtMs - nowMs) / 1000)),
      },
    });

    // The new schedule won: retire replaced reminders, then record quota.
    const replacedCount = decision.action === 'allow-replace' ? decision.replacedIds.length : 0;
    for (const oldId of decision.action === 'allow-replace' ? decision.replacedIds : []) {
      if (oldId !== id) await cancelScheduledReminderById(oldId);
    }

    await persistDelivery(persistSettings, nextDeliveryRecord(nowMs, record, id, replacedCount));
    return id;
  } catch {
    return null;
  }
}

function nextTimeOutsideQuietHours(from: Date, quietStart: string, quietEnd: string): Date | null {
  // Step forward in 5-minute increments up to 12h to find the quiet-hours exit.
  let cursor = new Date(from.getTime());
  for (let i = 0; i < 144; i++) {
    if (!isInQuietHours(cursor, quietStart, quietEnd)) return cursor;
    cursor = new Date(cursor.getTime() + 5 * 60 * 1000);
  }
  return null;
}

/**
 * Schedule pause check-in reminder (default 10 minutes, bounded by policy).
 */
export async function schedulePauseReminder(
  settings: UserSettings,
  activityName?: string,
  options?: { persistSettings?: (partial: Partial<UserSettings>) => Promise<void>; isSleeping?: boolean }
): Promise<string | null> {
  const title = 'AEVIA Check-in';
  const body = settings.privacyMode
    ? 'Still taking a break? Resume when you are ready.'
    : activityName
    ? `Paused ${activityName}. Ready to resume?`
    : 'Still taking a break? Resume when you are ready.';
  return scheduleBoundedReminder({
    settings,
    kind: 'pause',
    title,
    body,
    secondsFromNow: Math.max(60, settings.pauseReminderMinutes * 60),
    persistSettings: options?.persistSettings,
    isSleeping: options?.isSleeping,
  });
}

/**
 * Schedule idle check-in reminder (default 30 minutes while awake).
 */
export async function scheduleIdleReminder(
  settings: UserSettings,
  options?: { persistSettings?: (partial: Partial<UserSettings>) => Promise<void>; isSleeping?: boolean }
): Promise<string | null> {
  return scheduleBoundedReminder({
    settings,
    kind: 'idle',
    title: 'AEVIA Check-in',
    body: 'A little time is unaccounted for. Want to give it a name?',
    secondsFromNow: Math.max(60, settings.idleReminderMinutes * 60),
    persistSettings: options?.persistSettings,
    isSleeping: options?.isSleeping,
  });
}

/**
 * Opt-in Focus target reminder. Never scheduled implicitly; call only when the
 * user explicitly enables it for the live Focus session.
 */
export async function scheduleFocusTargetReminder(
  settings: UserSettings,
  targetAtMs: number,
  activityName?: string,
  options?: { persistSettings?: (partial: Partial<UserSettings>) => Promise<void> }
): Promise<string | null> {
  const seconds = Math.round((targetAtMs - Date.now()) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return scheduleBoundedReminder({
    settings,
    kind: 'focus-target',
    title: 'Focus target reached',
    body: settings.privacyMode
      ? 'Your focus target is complete. Continue or finish whenever ready.'
      : activityName
      ? `${activityName} target complete. Continue overtime or finish.`
      : 'Your focus target is complete. Continue or finish whenever ready.',
    secondsFromNow: seconds,
    data: { targetAtMs },
    rescheduleAfterQuietHours: false,
    persistSettings: options?.persistSettings,
  });
}

/**
 * Snooze the next check-in by 15/30/60 minutes. Returns the new schedule id.
 */
export async function snoozeReminder(
  settings: UserSettings,
  minutes: 15 | 30 | 60,
  kind: ReminderKind = 'snoozed',
  persistSettings?: (partial: Partial<UserSettings>) => Promise<void>
): Promise<string | null> {
  if (!REMINDER_POLICY.snoozeOptionsMinutes.includes(minutes)) return null;
  return scheduleBoundedReminder({
    settings,
    kind,
    title: 'AEVIA Check-in',
    body: 'Snoozed. I will check in once more, then stay quiet.',
    secondsFromNow: minutes * 60,
    data: { snoozedMinutes: minutes },
    persistSettings,
  });
}

/**
 * Foreground reconciliation hook: call on app foreground (NOT on a timer) to
 * drop stale duplicate schedules, prune the tracked-ID record so quota state
 * always reflects reality, and keep exactly one bounded next reminder.
 * Never mutates session state.
 */
export async function reconcileRemindersOnForeground(
  settings: UserSettings,
  hasLiveSession: boolean,
  persistSettings?: (partial: Partial<UserSettings>) => Promise<void>
): Promise<void> {
  if (notificationsUnavailable() || !settings.remindersEnabled) return;
  try {
    const Notifications = await import('expo-notifications');
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) => {
      const data = (n.content.data ?? {}) as Record<string, unknown>;
      return typeof data.kind === 'string' || typeof data.action === 'string';
    });
    // Keep at most the soonest; cancel stale duplicates without touching sessions.
    if (ours.length > 1) {
      const sorted = [...ours].sort((a, b) => {
        const at = (a.trigger as unknown as { value?: number })?.value ?? 0;
        const bt = (b.trigger as unknown as { value?: number })?.value ?? 0;
        return at - bt;
      });
      for (const extra of sorted.slice(1)) {
        await Notifications.cancelScheduledNotificationAsync(extra.identifier);
      }
    }
    // Prune tracked IDs that are no longer pending so quota state persists.
    const record = readDeliveryRecord(settings);
    const stillPending = new Set(scheduled.map((n) => n.identifier));
    const pruned = record.scheduledIds.filter((id) => stillPending.has(id));
    if (pruned.length !== record.scheduledIds.length) {
      await persistDelivery(persistSettings, { ...record, scheduledIds: pruned });
    }
    if (!hasLiveSession && ours.length === 0) {
      await scheduleIdleReminder(settings, { persistSettings });
    }
  } catch {
    // Best-effort only.
  }
}

/**
 * Register the stale-tap router once. On tap, the current truth route is
 * resolved AND navigated to — a stale pause/idle tap always lands on the
 * live state and never replays a stale mutation.
 */
export async function registerNotificationTapRouter(
  resolveCurrentRoute: () => string,
  navigate: (route: string) => void
): Promise<() => void> {
  if (notificationsUnavailable() || notificationTapListenerRegistered) return () => {};
  try {
    const Notifications = await import('expo-notifications');
    const handleTap = createReminderTapHandler(resolveCurrentRoute, navigate);
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      handleTap();
    });
    const coldLaunchResponse = await Notifications.getLastNotificationResponseAsync();
    if (coldLaunchResponse) {
      handleTap();
      await Notifications.clearLastNotificationResponseAsync();
    }
    notificationTapListenerRegistered = true;
    return () => {
      notificationTapListenerRegistered = false;
      sub.remove();
    };
  } catch {
    return () => {};
  }
}

/**
 * Trigger an immediate test reminder for user confirmation in Settings
 */
export async function sendTestReminder(settings: UserSettings): Promise<boolean> {
  if (notificationsUnavailable()) return false;

  try {
    await configureNotifications();
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'AEVIA Test Reminder',
        body: settings.privacyMode
          ? 'Notifications are configured and working privately.'
          : 'Notifications are configured. Activity names will be displayed.',
        channelId: 'vigil_checkins',
      } as unknown as Record<string, unknown> as never,
      trigger: null, // Immediate
    });
    return true;
  } catch {
    return false;
  }
}
