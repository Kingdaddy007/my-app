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

  if (typeof data.version !== 'number' || data.version !== 1) {
    return {
      isValid: false,
      errorMessage: `Unsupported backup schema version: ${data.version}. Expected version 1.`,
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

  // Validate intervals integrity: endMs must be >= startMs if not null
  for (const inv of intervals) {
    if (typeof inv.startMs !== 'number') {
      return { isValid: false, errorMessage: `Interval ${inv.id} has invalid start timestamp.` };
    }
    if (inv.endMs != null && inv.endMs < inv.startMs) {
      return { isValid: false, errorMessage: `Interval ${inv.id} has end time before start time.` };
    }
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
