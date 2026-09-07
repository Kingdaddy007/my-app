import { DayAccounting, Priority, WakeMarker } from './types';

export type InsightMessage = {
  id: string;
  type: 'longest_uninterrupted' | 'pause_ratio' | 'wake_to_activity' | 'priority_progress' | 'sparse_data' | 'balance';
  title: string;
  detail: string;
  metric?: string;
};

/**
 * Format milliseconds into human-readable hours and minutes (e.g. "1h 45m" or "38m")
 */
export function formatDurationCompact(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Generates transparent, honest factual insights without speculation or preachiness.
 */
export function generateFactualInsights(
  accounting: DayAccounting,
  wakeMarker?: WakeMarker | null,
  priorities: Priority[] = []
): InsightMessage[] {
  const insights: InsightMessage[] = [];

  // 1. Sparse data check: if less than 15 minutes of recorded activity
  if (accounting.accountedActiveMs < 15 * 60 * 1000) {
    insights.push({
      id: 'sparse_data',
      type: 'sparse_data',
      title: 'Beginning your day',
      detail: 'Tracking begins when you record your first session. Choose an activity above to start.',
      metric: `${formatDurationCompact(accounting.accountedActiveMs)} recorded`,
    });
    return insights;
  }

  // 2. Longest uninterrupted session (factual arithmetic)
  if (accounting.longestUninterruptedMs >= 15 * 60 * 1000) {
    insights.push({
      id: 'longest_uninterrupted',
      type: 'longest_uninterrupted',
      title: 'Longest recorded interval',
      detail: `Your longest uninterrupted active interval today was ${formatDurationCompact(accounting.longestUninterruptedMs)}.`,
      metric: formatDurationCompact(accounting.longestUninterruptedMs),
    });
  }

  // 3. Wake to first activity (ONLY if explicit wake marker exists)
  if (wakeMarker) {
    const firstActive = accounting.intervals.find((i) => i.kind === 'active' || i.kind === 'manual');
    if (firstActive && firstActive.startMs >= wakeMarker.timestampMs) {
      const diffMs = firstActive.startMs - wakeMarker.timestampMs;
      insights.push({
        id: 'wake_to_activity',
        type: 'wake_to_activity',
        title: 'Wake to first activity',
        detail: `${formatDurationCompact(diffMs)} between your recorded wake time and starting ${firstActive.activityName ?? 'activity'}.`,
        metric: formatDurationCompact(diffMs),
      });
    }
  }

  // 4. Pause / interruption balance
  if (accounting.interruptionCount > 0) {
    insights.push({
      id: 'pause_ratio',
      type: 'pause_ratio',
      title: 'Recorded pauses',
      detail: `${accounting.interruptionCount} paused intervals totaling ${formatDurationCompact(accounting.accountedPauseMs)}.`,
      metric: `${accounting.interruptionCount} pauses`,
    });
  }

  // 5. Priorities progress
  if (priorities.length > 0) {
    const completed = priorities.filter((p) => p.completedAt != null).length;
    insights.push({
      id: 'priority_progress',
      type: 'priority_progress',
      title: "Today's priorities",
      detail: `${completed} of ${priorities.length} planned priorities marked complete.`,
      metric: `${completed}/${priorities.length}`,
    });
  }

  return insights;
}
