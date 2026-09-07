import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SqlJsAdapter } from '../src/data/sqlJsAdapter';
import { initializeDatabase } from '../src/data/schema';
import { Repository } from '../src/data/repository';
import { TimeEngine } from '../src/domain/timeEngine';
import { TestClock } from '../src/domain/clock';
import { computeDayAccounting } from '../src/domain/dayCalculator';

describe('T03 - Durable Time Engine & Accounting Verification', () => {
  let db: SqlJsAdapter;
  let repo: Repository;
  let clock: TestClock;
  let engine: TimeEngine;

  beforeEach(async () => {
    db = await SqlJsAdapter.create();
    await initializeDatabase(db);
    repo = new Repository(db);
    clock = new TestClock(new Date('2026-09-07T09:00:00.000Z').getTime());
    engine = new TimeEngine(db, repo, clock);
  });

  afterEach(async () => {
    await db.close();
  });

  test('A01: Golden Path - 09:00 start, 09:20 pause, 09:30 resume, 10:00 finish', async () => {
    const t0900 = new Date('2026-09-07T09:00:00.000Z').getTime();
    const t0920 = new Date('2026-09-07T09:20:00.000Z').getTime();
    const t0930 = new Date('2026-09-07T09:30:00.000Z').getTime();
    const t1000 = new Date('2026-09-07T10:00:00.000Z').getTime();

    // 09:00 Start
    clock.setTime(t0900);
    const session = await engine.start('act-deep-work');
    expect(session.status).toBe('running');

    // 09:20 Pause
    clock.setTime(t0920);
    const pausedSession = await engine.pause('Break');
    expect(pausedSession.status).toBe('paused');

    // 09:30 Resume
    clock.setTime(t0930);
    const resumedSession = await engine.resume();
    expect(resumedSession.status).toBe('running');

    // 10:00 Finish
    clock.setTime(t1000);
    const finishedSession = await engine.finish();
    expect(finishedSession.status).toBe('completed');

    // Validate intervals
    const intervals = await repo.getIntervals();
    expect(intervals.length).toBe(3);

    // Interval 1: 09:00 - 09:20 (active, 20m)
    expect(intervals[0].kind).toBe('active');
    expect(intervals[0].startMs).toBe(t0900);
    expect(intervals[0].endMs).toBe(t0920);
    expect(intervals[0].endMs! - intervals[0].startMs).toBe(20 * 60 * 1000);

    // Interval 2: 09:20 - 09:30 (pause, 10m)
    expect(intervals[1].kind).toBe('pause');
    expect(intervals[1].startMs).toBe(t0920);
    expect(intervals[1].endMs).toBe(t0930);
    expect(intervals[1].reason).toBe('Break');
    expect(intervals[1].endMs! - intervals[1].startMs).toBe(10 * 60 * 1000);

    // Interval 3: 09:30 - 10:00 (active, 30m)
    expect(intervals[2].kind).toBe('active');
    expect(intervals[2].startMs).toBe(t0930);
    expect(intervals[2].endMs).toBe(t1000);
    expect(intervals[2].endMs! - intervals[2].startMs).toBe(30 * 60 * 1000);

    // Verify day accounting totals
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);
    const sessions = await repo.getSessions();
    const accounting = computeDayAccounting('2026-09-07', t1000, intervals, sessions, activities, categories);

    // 50m active, 10m pause, 60m elapsed, longest active 30m
    expect(accounting.accountedActiveMs).toBe(50 * 60 * 1000);
    expect(accounting.accountedPauseMs).toBe(10 * 60 * 1000);
    expect(accounting.longestUninterruptedMs).toBe(30 * 60 * 1000);
    expect(accounting.interruptionCount).toBe(1);
    expect(accounting.accountedActiveMs + accounting.accountedPauseMs).toBe(60 * 60 * 1000);
  });

  test('A02: Idempotency & Double-tap Prevention - Rapid start/pause calls', async () => {
    const t0 = clock.now();
    const s1 = await engine.start('act-deep-work', t0);
    // Immediate second start with same activity
    const s2 = await engine.start('act-deep-work', t0);
    expect(s1.id).toBe(s2.id);

    // One session only
    const allSessions = await repo.getSessions();
    expect(allSessions.length).toBe(1);

    // Pause twice
    clock.advance(60000);
    const p1 = await engine.pause('Break');
    const p2 = await engine.pause('Break');
    expect(p1.id).toBe(p2.id);

    // Intervals should contain exactly 1 active and 1 open pause
    const intervals = await repo.getIntervals();
    expect(intervals.length).toBe(2);
    expect(intervals[0].kind).toBe('active');
    expect(intervals[1].kind).toBe('pause');
    expect(intervals[1].endMs).toBeNull();
  });

  test('A03: Process Relaunch & State Recovery from Timestamps', async () => {
    const t0 = clock.now();
    await engine.start('act-deep-work', t0);

    // Simulate 25 minutes passing while app was backgrounded or terminated
    clock.advance(25 * 60 * 1000);

    // Reopen: create new engine instance with same db
    const freshEngine = new TimeEngine(db, repo, clock);
    const state = await freshEngine.getCurrentState();

    expect(state.session).not.toBeNull();
    expect(state.session?.status).toBe('running');
    expect(state.elapsedActiveMs).toBe(25 * 60 * 1000);
    expect(state.totalElapsedMs).toBe(25 * 60 * 1000);
    expect(state.openInterval?.kind).toBe('active');
  });

  test('A04: Cross-Midnight Session Clipping', async () => {
    // Session starts at 23:30 on 2026-09-07 (local) and finishes at 01:00 on 2026-09-08 (local)
    const startMs = new Date(2026, 8, 7, 23, 30, 0).getTime();
    const finishMs = new Date(2026, 8, 8, 1, 0, 0).getTime();

    clock.setTime(startMs);
    await engine.start('act-deep-work');
    clock.setTime(finishMs);
    await engine.finish();

    const intervals = await repo.getIntervals();
    const sessions = await repo.getSessions();
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);

    // In UTC day 2026-09-07: 23:30 to 24:00 = 30m
    const accountingDay1 = computeDayAccounting('2026-09-07', finishMs, intervals, sessions, activities, categories);
    // In UTC day 2026-09-08: 00:00 to 01:00 = 60m
    const accountingDay2 = computeDayAccounting('2026-09-08', finishMs, intervals, sessions, activities, categories);

    expect(accountingDay1.intervals.length).toBe(1);
    expect(accountingDay2.intervals.length).toBe(1);
    expect(accountingDay1.accountedActiveMs + accountingDay2.accountedActiveMs).toBe(90 * 60 * 1000);
  });

  test('A05: Clock Anomaly / Backward Jump Protection', async () => {
    const t0 = clock.now();
    await engine.start('act-deep-work', t0);

    // Simulate clock jumped backwards by 10 minutes
    const backwardTime = t0 - 10 * 60 * 1000;
    clock.setTime(backwardTime);

    const state = await engine.getCurrentState();
    // Duration must not be negative
    expect(state.elapsedActiveMs).toBe(0);
    expect(state.totalElapsedMs).toBe(0);
  });

  test('A06: Label Pause as Rest - In-place reclassification without duplicate interval', async () => {
    const t0 = clock.now();
    await engine.start('act-deep-work', t0);
    clock.advance(10 * 60 * 1000);
    await engine.pause(); // unlabeled pause

    const intervals = await repo.getIntervals();
    const pauseInv = intervals.find((i) => i.kind === 'pause')!;
    expect(pauseInv.reason).toBeNull();

    // Label pause as 'Rest'
    await engine.labelPause(pauseInv.id, 'Rest');

    const updated = await repo.getIntervalById(pauseInv.id);
    expect(updated?.reason).toBe('Rest');
    expect(updated?.revision).toBe(2);

    // No duplicate intervals created
    const allIntervals = await repo.getIntervals();
    expect(allIntervals.length).toBe(2);
  });

  test('A07: Gap Split and Collision Validation', async () => {
    const t0 = clock.now();
    const gapStart = t0 + 1000;
    const gapEnd = gapStart + 30 * 60 * 1000; // 30m gap

    // Split 30m gap into Cleaning 20m and Rest 10m
    await engine.splitGap(gapStart, gapEnd, [
      { activityId: 'act-cleaning', durationMs: 20 * 60 * 1000 },
      { activityId: 'act-rest', durationMs: 10 * 60 * 1000, reason: 'Rest' },
    ]);

    const intervals = await repo.getIntervals(gapStart, gapEnd);
    expect(intervals.length).toBe(2);
    expect(intervals[0].activityId).toBe('act-cleaning');
    expect(intervals[0].endMs! - intervals[0].startMs).toBe(20 * 60 * 1000);
    expect(intervals[1].activityId).toBe('act-rest');
    expect(intervals[1].endMs! - intervals[1].startMs).toBe(10 * 60 * 1000);

    // Collision rejection: trying to split overlapping interval throws
    await expect(
      engine.splitGap(gapStart + 5 * 60 * 1000, gapEnd + 10 * 60 * 1000, [
        { activityId: 'act-study', durationMs: 15 * 60 * 1000 },
      ])
    ).rejects.toThrow('GAP_COLLISION');
  });

  test('A08: Atomic Rollback on Error - Failed transaction leaves state intact', async () => {
    const t0 = clock.now();
    await engine.start('act-deep-work', t0);

    // Try starting another session while one is active -> should fail atomically
    await expect(engine.start('act-study', t0 + 1000)).rejects.toThrow('ACTIVE_SESSION_EXISTS');

    // Confirm state remains running deep work
    const current = await repo.getCurrentSession();
    expect(current?.session.activityId).toBe('act-deep-work');
    expect(current?.session.status).toBe('running');
  });

  test('Atomic Switch Activity', async () => {
    const t0 = clock.now();
    await engine.start('act-deep-work', t0);
    clock.advance(15 * 60 * 1000);

    // Switch to study
    const newSession = await engine.switchActivity('act-study');
    expect(newSession.activityId).toBe('act-study');
    expect(newSession.status).toBe('running');

    // Verify first session is completed and second is running
    const sessions = await repo.getSessions();
    expect(sessions.length).toBe(2);
    expect(sessions[0].status).toBe('completed');
    expect(sessions[1].status).toBe('running');
  });
});
