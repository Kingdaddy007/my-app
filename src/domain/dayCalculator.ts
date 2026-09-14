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
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error('INVALID_DATE: Expected local date as YYYY-MM-DD.');
  }

  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day + 1, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    throw new Error('INVALID_DATE: Unresolvable local day bounds.');
  }

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
  categories: ActivityCategory[],
  trackingAwarenessStartedAtMs?: number | null
): DayAccounting {
  const { dayStartMs, dayEndMs } = getLocalDayBounds(dateString);
  const totalDaySpanMs = dayEndMs - dayStartMs;
  const isToday = nowMs >= dayStartMs && nowMs < dayEndMs;
  const isFutureDay = nowMs < dayStartMs;
  const effectiveDayLimitMs = isFutureDay ? dayStartMs : isToday ? Math.min(nowMs, dayEndMs) : dayEndMs;
  const accountingStartMs = Math.min(
    effectiveDayLimitMs,
    Math.max(dayStartMs, trackingAwarenessStartedAtMs ?? dayStartMs)
  );
  const futureMs = isFutureDay
    ? totalDaySpanMs
    : isToday
      ? Math.max(0, dayEndMs - effectiveDayLimitMs)
      : 0;

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
    const clippedStart = Math.max(accountingStartMs, rawStart);
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

  // 2. Sweep-line attribution: every instant inside the accounting window is
  // attributed to exactly ONE bucket, so accounted totals always partition
  // elapsed time even when stored intervals overlap (corruption is displayed
  // honestly instead of inflating totals). Deterministic precedence:
  // sleep > active/manual > pause; ties break by earliest start, then id.
  const precedence = (kind: string): number =>
    kind === 'sleep' ? 0 : kind === 'active' || kind === 'manual' ? 1 : 2;

  let accountedActiveMs = 0;
  let accountedPauseMs = 0;
  let accountedSleepMs = 0;
  let longestUninterruptedMs = 0;
  let interruptionCount = 0;

  const categoryTotalsMap = new Map<string, { totalMs: number; activityIds: Set<string> }>();
  // Initialize category map for all defined categories
  for (const cat of categories) {
    categoryTotalsMap.set(cat.id, { totalMs: 0, activityIds: new Set() });
  }

  const creditWinner = (winner: (typeof clipped)[number], spanMs: number): void => {
    if (winner.kind === 'active' || winner.kind === 'manual') {
      accountedActiveMs += spanMs;
      if (winner.activityId) {
        const act = activityMap.get(winner.activityId);
        if (act) {
          const entry = categoryTotalsMap.get(act.categoryId) ?? { totalMs: 0, activityIds: new Set<string>() };
          entry.totalMs += spanMs;
          entry.activityIds.add(winner.activityId);
          categoryTotalsMap.set(act.categoryId, entry);
        }
      }
    } else if (winner.kind === 'pause') {
      accountedPauseMs += spanMs;
    } else if (winner.kind === 'sleep') {
      accountedSleepMs += spanMs;
      const sleepCatId = (winner.activityId && activityMap.get(winner.activityId)?.categoryId)
        ?? categories.find((c) => c.id === 'cat-sleep' || c.name.toLowerCase() === 'sleep')?.id;
      if (sleepCatId) {
        const entry = categoryTotalsMap.get(sleepCatId) ?? { totalMs: 0, activityIds: new Set<string>() };
        entry.totalMs += spanMs;
        if (winner.activityId) entry.activityIds.add(winner.activityId);
        categoryTotalsMap.set(sleepCatId, entry);
      }
    }
  };

  if (clipped.length > 0) {
    const boundaries = new Set<number>();
    for (const item of clipped) {
      boundaries.add(item.startMs);
      boundaries.add(item.endMs);
    }
    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const spanStart = sorted[i];
      const spanEnd = sorted[i + 1];
      const spanMs = spanEnd - spanStart;
      if (spanMs <= 0) continue;
      let winner: (typeof clipped)[number] | null = null;
      for (const item of clipped) {
        if (item.startMs <= spanStart && item.endMs >= spanEnd) {
          if (
            !winner ||
            precedence(item.kind) < precedence(winner.kind) ||
            (precedence(item.kind) === precedence(winner.kind) &&
              (item.startMs < winner.startMs ||
                (item.startMs === winner.startMs && item.id < winner.id)))
          ) {
            winner = item;
          }
        }
      }
      if (winner) creditWinner(winner, spanMs);
    }
  }

  // Longest single uninterrupted active segment + pause count are record
  // facts, independent of overlap attribution.
  for (const item of clipped) {
    if (item.kind === 'active' || item.kind === 'manual') {
      if (item.durationMs > longestUninterruptedMs) {
        longestUninterruptedMs = item.durationMs;
      }
    } else if (item.kind === 'pause') {
      interruptionCount += 1;
    }
  }

  // 3. Compute untracked gaps between accountingStartMs and effectiveDayLimitMs.
  // Gaps below the card threshold stay in untrackedMs but are not shown as
  // labelable cards, so sub-minute boundary noise never prompts bookkeeping.
  const MIN_GAP_CARD_MS = 30000;
  const gaps: UntrackedGap[] = [];
  let cursorMs = accountingStartMs;

  for (const item of clipped) {
    if (item.startMs > cursorMs) {
      const gapDuration = item.startMs - cursorMs;
      if (gapDuration >= MIN_GAP_CARD_MS) {
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
    if (trailingDuration >= MIN_GAP_CARD_MS) {
      gaps.push({
        id: `gap_${cursorMs}_${effectiveDayLimitMs}`,
        startMs: cursorMs,
        endMs: effectiveDayLimitMs,
        durationMs: trailingDuration,
      });
    }
  }

  // Exact partition: attributed totals come from the sweep above, so
  // active + pause + sleep + untracked always equals elapsed, by construction.
  const totalElapsedMs = Math.max(0, effectiveDayLimitMs - accountingStartMs);
  const totalAttributedMs = accountedActiveMs + accountedPauseMs + accountedSleepMs;
  const untrackedMs = Math.max(0, totalElapsedMs - totalAttributedMs);

  const categoryTotals = Array.from(categoryTotalsMap.entries()).map(([catId, data]) => {
    const cat = categoryMap.get(catId)!;
    return {
      categoryId: catId,
      categoryName: cat?.name ?? 'Unknown',
      color: cat?.color ?? '#888888',
      totalMs: data.totalMs,
      activityCount: data.activityIds.size,
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
