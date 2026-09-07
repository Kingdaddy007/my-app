import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SqlJsAdapter } from '../src/data/sqlJsAdapter';
import { initializeDatabase } from '../src/data/schema';
import { Repository } from '../src/data/repository';
import { TimeEngine } from '../src/domain/timeEngine';
import { TestClock } from '../src/domain/clock';
import { validateBackupData } from '../src/domain/backup';

describe('T09 - Backup & Recovery Invariants (A10)', () => {
  let db: SqlJsAdapter;
  let repo: Repository;
  let clock: TestClock;
  let engine: TimeEngine;

  beforeEach(async () => {
    db = await SqlJsAdapter.create();
    await initializeDatabase(db);
    repo = new Repository(db);
    clock = new TestClock(new Date('2026-09-07T10:00:00.000Z').getTime());
    engine = new TimeEngine(db, repo, clock);
  });

  afterEach(async () => {
    await db.close();
  });

  test('A10: Export, validate and restore round-trip preserves state', async () => {
    // 1. Create a session and interval
    await engine.start('act-deep-work');
    clock.advance(25 * 60 * 1000);
    await engine.finish();

    // 2. Save priority and settings
    await repo.savePriority({
      id: 'p-1',
      targetDate: '2026-09-07',
      title: 'Deep focus on VIGIL',
      order: 0,
      completedAt: null,
      createdAt: clock.now(),
    });
    await repo.updateSettings({ profileName: 'Beloved', themePreference: 'dark' });

    // 3. Export
    const backup = await repo.exportAllData();
    expect(backup.version).toBe(1);
    expect(backup.data.sessions.length).toBe(1);
    expect(backup.data.priorities.length).toBe(1);
    expect(backup.data.settings.profileName).toBe('Beloved');
    expect(backup.data.settings.themePreference).toBe('dark');

    // 4. Validate backup schema
    const validation = validateBackupData(backup);
    expect(validation.isValid).toBe(true);

    // 5. Clear database
    await repo.clearAllData();
    const afterClear = await repo.getSessions();
    expect(afterClear.length).toBe(0);

    // 6. Restore from backup
    await repo.restoreAllData(backup);

    // 7. Verify all restored records
    const restoredSessions = await repo.getSessions();
    expect(restoredSessions.length).toBe(1);
    expect(restoredSessions[0].activityId).toBe('act-deep-work');

    const restoredPriorities = await repo.getPrioritiesForDate('2026-09-07');
    expect(restoredPriorities.length).toBe(1);
    expect(restoredPriorities[0].title).toBe('Deep focus on VIGIL');

    const restoredSettings = await repo.getSettings();
    expect(restoredSettings.profileName).toBe('Beloved');
    expect(restoredSettings.themePreference).toBe('dark');
  });

  test('A10: Invalid backup payload rejected without data loss', async () => {
    await engine.start('act-deep-work');
    const beforeSessions = await repo.getSessions();
    expect(beforeSessions.length).toBe(1);

    const corruptBackup = {
      version: 999, // unsupported future version
      data: null,
    };

    const validation = validateBackupData(corruptBackup);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Unsupported backup schema');

    // Data should remain untouched
    const afterSessions = await repo.getSessions();
    expect(afterSessions.length).toBe(1);
  });
});
