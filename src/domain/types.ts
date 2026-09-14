/**
 * AEVIA Domain Types
 * Precise types for sessions, intervals, activities, categories, priorities, and settings.
 */

export type UUID = string;

export type ActivityCategory = {
  id: UUID;
  name: string;
  color: string;
  icon: string;
  isDefault?: boolean;
  createdAt: number;
};

export type Activity = {
  id: UUID;
  name: string;
  iconKey: string;
  categoryId: UUID;
  isFavorite: boolean;
  isArchived: boolean;
  targetSeconds?: number | null;
  createdAt: number;
  updatedAt: number;
};

export type SessionStatus = 'running' | 'paused' | 'completed';
export type SessionExperience = 'track' | 'focus';

export type SessionStartOptions = {
  experience: SessionExperience;
  targetSeconds?: number | null;
  intention?: string | null;
};

export type Session = {
  id: UUID;
  activityId: UUID;
  status: SessionStatus;
  experience: SessionExperience;
  startedAt: number; // UTC ms
  endedAt?: number | null; // UTC ms
  targetSeconds?: number | null;
  intention?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type IntervalKind = 'active' | 'pause' | 'manual' | 'sleep';

export type PauseReason = 'Break' | 'Phone call' | 'Distraction' | 'Rest' | 'Other' | string;

export type Interval = {
  id: UUID;
  sessionId?: UUID | null;
  activityId?: UUID | null;
  kind: IntervalKind;
  startMs: number; // UTC ms, inclusive
  endMs?: number | null; // UTC ms, exclusive (null if ongoing)
  reason?: PauseReason | null;
  revision: number;
};

export type WakeMarker = {
  id: UUID;
  timestampMs: number; // UTC ms
  source: 'manual';
  note?: string | null;
};

export type Priority = {
  id: UUID;
  targetDate: string; // YYYY-MM-DD local
  title: string;
  order: number; // 0, 1, 2 (max 3)
  activityId?: UUID | null;
  completedAt?: number | null; // UTC ms
  createdAt: number;
};

export type ThemePreference = 'system' | 'light' | 'dark';
export type TimeFormat = '12h' | '24h';

export type UserSettings = {
  profileName?: string | null;
  themePreference: ThemePreference;
  timeFormat: TimeFormat;
  remindersEnabled: boolean;
  pauseReminderMinutes: number; // default 10
  idleReminderMinutes: number; // default 30
  quietHoursStart: string; // '22:00'
  quietHoursEnd: string; // '07:00'
  privacyMode: boolean; // default true (generic text on lockscreen)
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  focusTargetReminderEnabled?: boolean; // default false; explicit opt-in only
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  trackingAwarenessStartedAtMs?: number | null;
  lastWakeMarkerMs?: number | null;
};

export type BackupData = {
  version: number;
  appVersion: string;
  exportedAt: number; // UTC ms
  timezone: string;
  utcOffsetMinutes: number;
  data: {
    categories: ActivityCategory[];
    activities: Activity[];
    sessions: Session[];
    intervals: Interval[];
    wakeMarkers: WakeMarker[];
    priorities: Priority[];
    settings: UserSettings;
  };
};

export type DayAccounting = {
  date: string; // YYYY-MM-DD
  dayStartMs: number;
  dayEndMs: number;
  currentInstantMs: number;
  isToday: boolean;
  accountedActiveMs: number;
  accountedPauseMs: number;
  accountedSleepMs: number;
  untrackedMs: number;
  futureMs: number;
  totalDaySpanMs: number;
  categoryTotals: Array<{
    categoryId: UUID;
    categoryName: string;
    color: string;
    totalMs: number;
    activityCount: number;
  }>;
  intervals: ClippedInterval[];
  gaps: UntrackedGap[];
  longestUninterruptedMs: number;
  interruptionCount: number;
};

export type ClippedInterval = {
  id: UUID;
  sessionId?: UUID | null;
  activityId?: UUID | null;
  activityName?: string;
  categoryName?: string;
  categoryColor?: string;
  kind: IntervalKind;
  startMs: number;
  endMs: number;
  durationMs: number;
  reason?: string | null;
  isOpen: boolean;
};

export type UntrackedGap = {
  id: string; // generated gap id
  startMs: number;
  endMs: number;
  durationMs: number;
};
