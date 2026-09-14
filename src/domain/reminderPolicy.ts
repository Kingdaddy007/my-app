/**
 * Pure bounded-reminder policy: at most one proactive reminder per hour and
 * four per local day. No platform imports so domain tests stay hermetic.
 */

export const REMINDER_POLICY = {
  maxPerHour: 1,
  maxPerDay: 4,
  snoozeOptionsMinutes: [15, 30, 60] as const,
} as const;

export type ReminderDeliveryRecord = {
  dayKey: string;
  /** Quota-consuming schedule events (replacements excluded) today. */
  countToday: number;
  /** Last quota-consuming schedule time (monotonic quota clock). */
  lastScheduledAtMs?: number;
  /**
   * Legacy field kept for backward compatibility: older records stored the
   * last schedule time here. Read as a fallback when lastScheduledAtMs is 0.
   */
  lastDeliveredAtMs?: number;
  /** Tracked OS notification identifiers scheduled by AEVIA. */
  scheduledIds: string[];
};

export function localDayKey(atMs: number): string {
  const d = new Date(atMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function canDeliverReminder(
  nowMs: number,
  record: Pick<ReminderDeliveryRecord, 'dayKey' | 'countToday'> & Partial<ReminderDeliveryRecord>
): { allowed: boolean; reason?: 'HOURLY_CAP' | 'DAILY_CAP' } {
  const today = localDayKey(nowMs);
  const countToday = record.dayKey === today ? record.countToday : 0;
  if (countToday >= REMINDER_POLICY.maxPerDay) return { allowed: false, reason: 'DAILY_CAP' };
  const lastQuotaMs = record.lastScheduledAtMs || record.lastDeliveredAtMs || 0;
  if (lastQuotaMs > 0 && nowMs - lastQuotaMs < 60 * 60 * 1000) {
    return { allowed: false, reason: 'HOURLY_CAP' };
  }
  return { allowed: true };
}

export function nextDeliveryRecord(
  nowMs: number,
  record: ReminderDeliveryRecord,
  scheduledId: string | null,
  replacedPendingCount = 0
): ReminderDeliveryRecord {
  const today = localDayKey(nowMs);
  const base =
    record.dayKey === today
      ? record
      : { dayKey: today, countToday: 0, lastScheduledAtMs: 0, scheduledIds: [] as string[] };
  // Replacing a still-pending reminder is not a new quota event: a cancelled
  // reminder must never consume the user's hourly/daily budget.
  const consumesQuota = replacedPendingCount <= 0;
  return {
    dayKey: today,
    countToday: base.countToday + (consumesQuota ? 1 : 0),
    lastScheduledAtMs: consumesQuota ? nowMs : base.lastScheduledAtMs,
    lastDeliveredAtMs: base.lastDeliveredAtMs,
    scheduledIds: scheduledId ? [...base.scheduledIds.slice(-9), scheduledId] : base.scheduledIds,
  };
}

export type ScheduleDecision =
  | { action: 'deny'; reason: 'HOURLY_CAP' | 'DAILY_CAP' }
  | { action: 'allow-new' }
  | { action: 'allow-replace'; replacedIds: string[] };

/**
 * Pure scheduling decider. Caps are evaluated BEFORE anything is cancelled,
 * and a replacement of still-pending reminders bypasses the hourly cap caused
 * by the very reminder being replaced (daily cap still applies).
 */
export function decideReminderSchedule(
  nowMs: number,
  record: ReminderDeliveryRecord,
  pendingTrackedIds: string[]
): ScheduleDecision {
  const today = localDayKey(nowMs);
  const countToday = record.dayKey === today ? record.countToday : 0;
  if (countToday >= REMINDER_POLICY.maxPerDay) {
    return { action: 'deny', reason: 'DAILY_CAP' };
  }
  if (pendingTrackedIds.length > 0) {
    return { action: 'allow-replace', replacedIds: pendingTrackedIds };
  }
  const cap = canDeliverReminder(nowMs, record);
  if (!cap.allowed) return { action: 'deny', reason: cap.reason ?? 'HOURLY_CAP' };
  return { action: 'allow-new' };
}

/**
 * Pure tap handler: resolves the live route and performs navigation through
 * the injected callback. Tested without native modules.
 */
export function createReminderTapHandler(
  resolveCurrentRoute: () => string,
  navigate: (route: string) => void
): () => void {
  return () => {
    navigate(resolveCurrentRoute());
  };
}
