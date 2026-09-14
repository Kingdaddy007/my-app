import { BackupData } from './types';

export type ValidationResult = {
  isValid: boolean;
  errorMessage?: string;
  itemCounts?: {
    categories: number;
    activities: number;
    sessions: number;
    intervals: number;
    priorities: number;
    wakeMarkers: number;
  };
};

export function validateBackupData(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errorMessage: 'Backup file is empty or not a JSON object.' };
  }

  if (typeof data.version !== 'number' || ![1, 2].includes(data.version)) {
    return {
      isValid: false,
      errorMessage: `Unsupported backup schema version: ${data.version}. Expected version 1 or 2.`,
    };
  }

  if (!data.data || typeof data.data !== 'object') {
    return { isValid: false, errorMessage: 'Backup data payload is missing or invalid.' };
  }

  const { categories, activities, sessions, intervals, priorities, wakeMarkers, settings } = data.data;

  if (!Array.isArray(categories) || !Array.isArray(activities) || !Array.isArray(sessions) || !Array.isArray(intervals)) {
    return {
      isValid: false,
      errorMessage: 'Malformed backup: required arrays (categories, activities, sessions, intervals) missing.',
    };
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { isValid: false, errorMessage: 'Backup settings payload is missing or invalid.' };
  }
  if (!Array.isArray(priorities) || !Array.isArray(wakeMarkers)) {
    return { isValid: false, errorMessage: 'Backup priorities/wake-marker payloads are missing or invalid.' };
  }
  const settingsRecord = settings as Record<string, unknown>;
  if (
    typeof settingsRecord.themePreference !== 'string' ||
    !['system', 'light', 'dark'].includes(settingsRecord.themePreference)
  ) {
    return { isValid: false, errorMessage: 'Backup settings carry an invalid theme preference.' };
  }

  // 1. Validate categories integrity
  const categoryIds = new Set<string>();
  for (const cat of categories) {
    if (!cat || typeof cat.id !== 'string' || !cat.id.trim()) {
      return { isValid: false, errorMessage: 'Backup contains a category with missing or invalid id.' };
    }
    if (typeof cat.name !== 'string' || !cat.name.trim()) {
      return { isValid: false, errorMessage: `Category ${cat.id} has missing or empty name.` };
    }
    categoryIds.add(cat.id);
  }

  // 2. Validate activities integrity & category foreign keys
  const activityIds = new Set<string>();
  for (const act of activities) {
    if (!act || typeof act.id !== 'string' || !act.id.trim()) {
      return { isValid: false, errorMessage: 'Backup contains an activity with missing or invalid id.' };
    }
    if (typeof act.name !== 'string' || !act.name.trim()) {
      return { isValid: false, errorMessage: `Activity ${act.id} has missing or empty name.` };
    }
    if (typeof act.categoryId !== 'string' || !categoryIds.has(act.categoryId)) {
      return {
        isValid: false,
        errorMessage: `Activity "${act.name}" (${act.id}) references unknown category: ${act.categoryId}.`,
      };
    }
    activityIds.add(act.id);
  }

  // 3. Validate sessions integrity & activity foreign keys
  const sessionIds = new Set<string>();
  const VALID_STATUSES = new Set(['running', 'paused', 'completed']);
  let openSessionCount = 0;
  for (const s of sessions) {
    if (!s || typeof s.id !== 'string' || !s.id.trim()) {
      return { isValid: false, errorMessage: 'Backup contains a session with missing or invalid id.' };
    }
    if (typeof s.activityId !== 'string' || !activityIds.has(s.activityId)) {
      return {
        isValid: false,
        errorMessage: `Session ${s.id} references unknown activity: ${s.activityId}.`,
      };
    }
    if (typeof s.status !== 'string' || !VALID_STATUSES.has(s.status)) {
      return { isValid: false, errorMessage: `Session ${s.id} has invalid status.` };
    }
    if (s.status !== 'completed') openSessionCount += 1;
    if (typeof s.startedAt !== 'number' || !Number.isFinite(s.startedAt) || s.startedAt <= 0) {
      return { isValid: false, errorMessage: `Session ${s.id} has invalid startedAt timestamp.` };
    }
    if (s.endedAt != null) {
      if (typeof s.endedAt !== 'number' || !Number.isFinite(s.endedAt) || s.endedAt < s.startedAt) {
        return { isValid: false, errorMessage: `Session ${s.id} has invalid endedAt timestamp.` };
      }
    }
    if (s.status === 'completed' && s.endedAt == null) {
      return { isValid: false, errorMessage: `Completed session ${s.id} must have an endedAt timestamp.` };
    }
    if (s.status !== 'completed' && s.endedAt != null) {
      return { isValid: false, errorMessage: `Open session ${s.id} cannot have an endedAt timestamp.` };
    }
    if (data.version >= 2 && s.experience !== 'track' && s.experience !== 'focus') {
      return { isValid: false, errorMessage: `Session ${s.id} has invalid experience metadata.` };
    }
    if (s.experience === 'track' && s.targetSeconds != null) {
      return { isValid: false, errorMessage: `Track session ${s.id} cannot contain a focus target.` };
    }
    if (s.targetSeconds != null && (!Number.isFinite(s.targetSeconds) || s.targetSeconds <= 0)) {
      return { isValid: false, errorMessage: `Session ${s.id} has invalid target duration.` };
    }
    if (s.intention != null && (typeof s.intention !== 'string' || s.intention.length > 160)) {
      return { isValid: false, errorMessage: `Session ${s.id} has invalid intention.` };
    }
    sessionIds.add(s.id);
  }
  if (openSessionCount > 1) {
    return { isValid: false, errorMessage: 'Backup contains multiple open sessions.' };
  }

  // 4. Validate intervals integrity, foreign keys, timestamps & overlap detection
  const VALID_KINDS = new Set(['active', 'pause', 'manual', 'sleep']);
  let openIntervalCount = 0;
  for (const inv of intervals) {
    if (!inv || typeof inv.id !== 'string') {
      return { isValid: false, errorMessage: 'Backup contains an interval with missing or invalid id.' };
    }
    if (typeof inv.kind !== 'string' || !VALID_KINDS.has(inv.kind)) {
      return { isValid: false, errorMessage: `Interval ${inv.id} has invalid kind.` };
    }
    if (typeof inv.revision !== 'number' || !Number.isFinite(inv.revision) || inv.revision < 1) {
      return { isValid: false, errorMessage: `Interval ${inv.id} has invalid revision.` };
    }
    if (inv.reason != null && typeof inv.reason !== 'string') {
      return { isValid: false, errorMessage: `Interval ${inv.id} has invalid reason.` };
    }
    if (inv.endMs == null) openIntervalCount += 1;
    if (typeof inv.startMs !== 'number' || !Number.isFinite(inv.startMs) || inv.startMs <= 0) {
      return { isValid: false, errorMessage: `Interval ${inv.id} has invalid start timestamp.` };
    }
    if (inv.endMs != null) {
      if (typeof inv.endMs !== 'number' || !Number.isFinite(inv.endMs) || inv.endMs <= inv.startMs) {
        return { isValid: false, errorMessage: `Interval ${inv.id} has end time before or equal to start time.` };
      }
    }
    if (inv.sessionId != null && !sessionIds.has(inv.sessionId)) {
      return { isValid: false, errorMessage: `Interval ${inv.id} references unknown session: ${inv.sessionId}.` };
    }
    if (inv.activityId != null && !activityIds.has(inv.activityId)) {
      return { isValid: false, errorMessage: `Interval ${inv.id} references unknown activity: ${inv.activityId}.` };
    }
  }
  if (openIntervalCount > 1) {
    return { isValid: false, errorMessage: 'Backup contains multiple open intervals.' };
  }

  // Live-state consistency: the open session (if any) must own exactly the
  // single open interval, and open-interval kind must match session status.
  // Completed sessions must not own open intervals, and only manual gap
  // labels may exist without a session.
  const openSessions = sessions.filter((s) => s.status !== 'completed');
  const openIntervals = intervals.filter((inv) => inv.endMs == null);
  if (openSessions.length === 1) {
    const openSession = openSessions[0];
    const ownedOpen = openIntervals.filter((inv) => inv.sessionId === openSession.id);
    if (ownedOpen.length !== 1) {
      return {
        isValid: false,
        errorMessage: `Open session ${openSession.id} must own exactly one open interval.`,
      };
    }
    const openKind = ownedOpen[0].kind;
    const kindMatchesStatus =
      (openSession.status === 'running' && (openKind === 'active' || openKind === 'sleep')) ||
      (openSession.status === 'paused' && openKind === 'pause');
    if (!kindMatchesStatus) {
      return {
        isValid: false,
        errorMessage: `Open interval kind "${openKind}" contradicts session status "${openSession.status}".`,
      };
    }
    if (openSession.status === 'running' && openKind === 'sleep' && openSession.experience !== 'track') {
      return { isValid: false, errorMessage: 'Sleep sessions must use the track experience.' };
    }
  }
  for (const inv of intervals) {
    if (inv.endMs == null && inv.sessionId != null) {
      const owner = sessions.find((s) => s.id === inv.sessionId);
      if (owner && owner.status === 'completed') {
        return { isValid: false, errorMessage: `Completed session ${owner.id} owns an open interval.` };
      }
    }
    if (inv.sessionId == null && inv.kind !== 'manual') {
      return { isValid: false, errorMessage: `Interval ${inv.id} has no session but is not a manual gap label.` };
    }
  }

  // Check for overlapping accounted intervals
  const sortedIntervals = [...intervals].sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < sortedIntervals.length - 1; i++) {
    const current = sortedIntervals[i];
    const currentEnd = current.endMs ?? Infinity;
    const next = sortedIntervals[i + 1];
    // In half-open intervals [start, end), collision occurs if next.startMs < currentEnd
    if (next.startMs < currentEnd) {
      return {
        isValid: false,
        errorMessage: `Overlapping intervals detected in backup between "${current.id}" and "${next.id}".`,
      };
    }
  }

  // 5. Validate priorities foreign keys if present
  if (Array.isArray(priorities)) {
    if (priorities.length > 1000) {
      return { isValid: false, errorMessage: 'Backup contains too many priorities.' };
    }
    for (const p of priorities) {
      if (!p || typeof p.id !== 'string' || !p.id.trim()) {
        return { isValid: false, errorMessage: 'Backup contains a priority with missing id.' };
      }
      if (typeof p.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.targetDate)) {
        return { isValid: false, errorMessage: `Priority ${p.id} has invalid target date.` };
      }
      if (typeof p.title !== 'string' || !p.title.trim() || p.title.length > 200) {
        return { isValid: false, errorMessage: `Priority ${p.id} has invalid title.` };
      }
      if (typeof p.order !== 'number' || !Number.isFinite(p.order) || p.order < 0) {
        return { isValid: false, errorMessage: `Priority ${p.id} has invalid order.` };
      }
      if (p.completedAt != null && (typeof p.completedAt !== 'number' || !Number.isFinite(p.completedAt) || p.completedAt <= 0)) {
        return { isValid: false, errorMessage: `Priority ${p.id} has invalid completion time.` };
      }
      if (p.activityId != null && !activityIds.has(p.activityId)) {
        return { isValid: false, errorMessage: `Priority ${p.id} references unknown activity: ${p.activityId}.` };
      }
    }
  }

  if (Array.isArray(wakeMarkers)) {
    if (wakeMarkers.length > 5000) {
      return { isValid: false, errorMessage: 'Backup contains too many wake markers.' };
    }
    for (const w of wakeMarkers) {
      if (!w || typeof w.id !== 'string' || typeof w.timestampMs !== 'number' || !Number.isFinite(w.timestampMs) || w.timestampMs <= 0) {
        return { isValid: false, errorMessage: 'Backup contains a wake marker with invalid timestamp.' };
      }
    }
  }

  if (intervals.length > 100000 || sessions.length > 20000) {
    return { isValid: false, errorMessage: 'Backup exceeds supported size limits.' };
  }

  return {
    isValid: true,
    itemCounts: {
      categories: categories.length,
      activities: activities.length,
      sessions: sessions.length,
      intervals: intervals.length,
      priorities: Array.isArray(priorities) ? priorities.length : 0,
      wakeMarkers: Array.isArray(wakeMarkers) ? wakeMarkers.length : 0,
    },
  };
}
