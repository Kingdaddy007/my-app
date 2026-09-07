import {
  Activity,
  ActivityCategory,
  ClippedInterval,
  DayAccounting,
  Interval,
  Session,
  UntrackedGap,
} from './types';

export type DayBounds = {
  dayStartMs: number;
  dayEndMs: number;
};

/**
 * Returns UTC ms for start (00:00:00.000) and end (24:00:00.000) of a local date (YYYY-MM-DD)
 */
export function getLocalDayBounds(dateString: string): DayBounds {
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day + 1, 0, 0, 0, 0);

  return {
    dayStartMs: start.getTime(),
    dayEndMs: end.getTime(),
  };
}

/**
 * Format a local Date into YYYY-MM-DD
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate comprehensive day accounting with precision clipping and gap detection.
 */
export function computeDayAccounting(
  dateString: string,
  nowMs: number,
  rawIntervals: Interval[],
  sessions: Session[],
  activities: Activity[],
  categories: ActivityCategory[]
): DayAccounting {
  const { dayStartMs, dayEndMs } = getLocalDayBounds(dateString);
  const isToday = nowMs >= dayStartMs && nowMs < dayEndMs;
  const effectiveDayLimitMs = isToday ? Math.min(nowMs, dayEndMs) : dayEndMs;
  const futureMs = isToday ? Math.max(0, dayEndMs - effectiveDayLimitMs) : 0;
  const totalDaySpanMs = dayEndMs - dayStartMs;

  const activityMap = new Map<string, Activity>();
  for (const act of activities) {
    activityMap.set(act.id, act);
  }

  const categoryMap = new Map<string, ActivityCategory>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const sessionMap = new Map<string, Session>();
  for (const s of sessions) {
    sessionMap.set(s.id, s);
  }

  // 1. Clip intervals to day boundaries and up to nowMs if today
  const clipped: ClippedInterval[] = [];

  for (const inv of rawIntervals) {
    const rawStart = inv.startMs;
    const rawEnd = inv.endMs ?? nowMs; // Open interval treated as ending at current time

    if (rawEnd <= rawStart) {
      continue; // Discard invalid or zero-duration
    }

    // Check if interval overlaps with [dayStartMs, effectiveDayLimitMs)
    const clippedStart = Math.max(dayStartMs, rawStart);
    const clippedEnd = Math.min(effectiveDayLimitMs, rawEnd);

    if (clippedEnd > clippedStart) {
      const actId = inv.activityId ?? (inv.sessionId ? sessionMap.get(inv.sessionId)?.activityId : null);
      const act = actId ? activityMap.get(actId) : undefined;
      const cat = act ? categoryMap.get(act.categoryId) : undefined;

      clipped.push({
        id: inv.id,
        sessionId: inv.sessionId,
        activityId: actId,
        activityName: act?.name,
        categoryName: cat?.name,
        categoryColor: cat?.color,
        kind: inv.kind,
        startMs: clippedStart,
        endMs: clippedEnd,
        durationMs: clippedEnd - clippedStart,
        reason: inv.reason,
        isOpen: inv.endMs == null,
      });
    }
  }

  // Sort chronologically by start time
  clipped.sort((a, b) => a.startMs - b.startMs);

  // 2. Aggregate accounted totals
  let accountedActiveMs = 0;
  let accountedPauseMs = 0;
  let accountedSleepMs = 0;
  let longestUninterruptedMs = 0;
  let interruptionCount = 0;

  const categoryTotalsMap = new Map<string, { totalMs: number; activityCount: number }>();
  // Initialize category map for all defined categories
  for (const cat of categories) {
    categoryTotalsMap.set(cat.id, { totalMs: 0, activityCount: 0 });
  }

  for (const item of clipped) {
    if (item.kind === 'active' || item.kind === 'manual') {
      accountedActiveMs += item.durationMs;
      if (item.durationMs > longestUninterruptedMs) {
        longestUninterruptedMs = item.durationMs;
      }
      if (item.activityId) {
        const act = activityMap.get(item.activityId);
        if (act) {
          const entry = categoryTotalsMap.get(act.categoryId) ?? { totalMs: 0, activityCount: 0 };
          entry.totalMs += item.durationMs;
          entry.activityCount += 1;
          categoryTotalsMap.set(act.categoryId, entry);
        }
      }
    } else if (item.kind === 'pause') {
      accountedPauseMs += item.durationMs;
      interruptionCount += 1;
      // If pause is labeled e.g. "Rest", check if there is a Rest category
      if (item.reason === 'Rest') {
        const restCat = categories.find((c) => c.name.toLowerCase() === 'rest');
        if (restCat) {
          const entry = categoryTotalsMap.get(restCat.id) ?? { totalMs: 0, activityCount: 0 };
          entry.totalMs += item.durationMs;
          categoryTotalsMap.set(restCat.id, entry);
        }
      }
    } else if (item.kind === 'sleep') {
      accountedSleepMs += item.durationMs;
      const sleepCat = categories.find((c) => c.name.toLowerCase() === 'sleep');
      if (sleepCat) {
        const entry = categoryTotalsMap.get(sleepCat.id) ?? { totalMs: 0, activityCount: 0 };
        entry.totalMs += item.durationMs;
        categoryTotalsMap.set(sleepCat.id, entry);
      }
    }
  }

  // 3. Compute untracked gaps between dayStartMs and effectiveDayLimitMs
  const gaps: UntrackedGap[] = [];
  let cursorMs = dayStartMs;

  for (const item of clipped) {
    if (item.startMs > cursorMs) {
      const gapDuration = item.startMs - cursorMs;
      // Minimum gap of 60 seconds (1 minute) to avoid 1ms boundary noise
      if (gapDuration >= 60000) {
        gaps.push({
          id: `gap_${cursorMs}_${item.startMs}`,
          startMs: cursorMs,
          endMs: item.startMs,
          durationMs: gapDuration,
        });
      }
    }
    cursorMs = Math.max(cursorMs, item.endMs);
  }

  // Trailing gap before effectiveDayLimitMs
  if (effectiveDayLimitMs > cursorMs) {
    const trailingDuration = effectiveDayLimitMs - cursorMs;
    if (trailingDuration >= 60000) {
      gaps.push({
        id: `gap_${cursorMs}_${effectiveDayLimitMs}`,
        startMs: cursorMs,
        endMs: effectiveDayLimitMs,
        durationMs: trailingDuration,
      });
    }
  }

  const untrackedMs = gaps.reduce((sum, g) => sum + g.durationMs, 0);

  const categoryTotals = Array.from(categoryTotalsMap.entries()).map(([catId, data]) => {
    const cat = categoryMap.get(catId)!;
    return {
      categoryId: catId,
      categoryName: cat?.name ?? 'Unknown',
      color: cat?.color ?? '#888888',
      totalMs: data.totalMs,
      activityCount: data.activityCount,
    };
  });

  return {
    date: dateString,
    dayStartMs,
    dayEndMs,
    currentInstantMs: nowMs,
    isToday,
    accountedActiveMs,
    accountedPauseMs,
    accountedSleepMs,
    untrackedMs,
    futureMs,
    totalDaySpanMs,
    categoryTotals,
    intervals: clipped,
    gaps,
    longestUninterruptedMs,
    interruptionCount,
  };
}
