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
    expect(backup.version).toBe(2);
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
    expect(restoredSessions[0].experience).toBe('track');

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

  test('A10: Overlapping intervals in backup payload are rejected', async () => {
    const validBackup = await repo.exportAllData();

    // Inject overlapping manual intervals with valid activity foreign keys
    const corruptBackup = JSON.parse(JSON.stringify(validBackup));
    corruptBackup.data.intervals.push({
      id: 'inv-overlap-1',
      sessionId: null,
      activityId: 'act-deep-work',
      kind: 'manual',
      startMs: 1000,
      endMs: 2000,
      revision: 1,
    });
    corruptBackup.data.intervals.push({
      id: 'inv-overlap-2',
      sessionId: null,
      activityId: 'act-deep-work',
      kind: 'manual',
      startMs: 1500, // overlaps [1000, 2000)
      endMs: 2500,
      revision: 1,
    });

    const validation = validateBackupData(corruptBackup);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Overlapping intervals detected');
  });

  test('A10: Unknown session foreign keys in backup are rejected', async () => {
    const validBackup = await repo.exportAllData();
    const corruptBackup = JSON.parse(JSON.stringify(validBackup));

    corruptBackup.data.intervals.push({
      id: 'inv-bad-sess',
      sessionId: 'non-existent-session-id',
      activityId: 'act-deep-work',
      kind: 'active',
      startMs: 5000,
      endMs: 6000,
      revision: 1,
    });

    const validation = validateBackupData(corruptBackup);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('references unknown session');
  });

  test('A10: Unknown category foreign keys in backup are rejected', async () => {
    const validBackup = await repo.exportAllData();
    const corruptBackup = JSON.parse(JSON.stringify(validBackup));

    // Point an activity to a nonexistent category
    corruptBackup.data.activities[0].categoryId = 'non-existent-cat-uuid';

    const validation = validateBackupData(corruptBackup);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('references unknown category');
  });

  test('A10: Non-numeric or negative timestamps in backup are rejected', async () => {
    const validBackup = await repo.exportAllData();
    const corruptBackup = JSON.parse(JSON.stringify(validBackup));

    corruptBackup.data.intervals.push({
      id: 'inv-bad-time',
      kind: 'active',
      startMs: -500, // negative timestamp
      endMs: 1000,
      revision: 1,
    });

    const validation = validateBackupData(corruptBackup);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('invalid start timestamp');
  });
});
