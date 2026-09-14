import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SqlJsAdapter } from '../src/data/sqlJsAdapter';
import { initializeDatabase } from '../src/data/schema';
import { Repository } from '../src/data/repository';
import { TimeEngine } from '../src/domain/timeEngine';
import { TestClock } from '../src/domain/clock';
import { computeDayAccounting, getLocalDayBounds } from '../src/domain/dayCalculator';
import { validateBackupData } from '../src/domain/backup';
import {
  acceptFriendship,
  authorizeSnapshotRead,
  buildDailyShareSnapshot,
  cancelFriendshipRequest,
  createDefaultSharePolicy,
  declineFriendship,
  requestFriendship,
  unblockRelationship,
  blockRelationship,
  unfriend,
} from '../src/domain/circle';
import { canDeliverReminder, createReminderTapHandler, decideReminderSchedule, nextDeliveryRecord } from '../src/domain/reminderPolicy';
import { deriveLivingDayState, formatSleptSummary } from '../src/domain/dayState';
import { buildWidgetState } from '../src/platform/widgetState';

describe('Living Day correctness repairs', () => {
  let db: SqlJsAdapter;
  let repo: Repository;
  let clock: TestClock;
  let engine: TimeEngine;
  const t0 = new Date('2026-09-14T09:00:00.000Z').getTime();

  beforeEach(async () => {
    db = await SqlJsAdapter.create();
    await initializeDatabase(db);
    repo = new Repository(db);
    clock = new TestClock(t0);
    engine = new TimeEngine(db, repo, clock);
  });

  afterEach(async () => {
    await db.close();
  });

  test('P0: backward clock is rejected without persisting overlap', async () => {
    await engine.start('act-deep-work', t0);
    await expect(engine.pause('Break', t0 - 10 * 60 * 1000)).rejects.toThrow('INVALID_TIME');
    const intervals = await repo.getIntervals();
    expect(intervals.length).toBe(1);
    expect(intervals[0].endMs).toBeNull();
  });

  test('P1: double-tap finish is idempotent; start while paused same activity returns current', async () => {
    await engine.start('act-deep-work', t0);
    clock.setTime(t0 + 60 * 1000);
    const first = await engine.finish();
    const second = await engine.finish();
    expect(second.id).toBe(first.id);
    expect(second.status).toBe('completed');

    await engine.start('act-study', t0 + 2 * 60 * 1000);
    await engine.pause('Break', t0 + 3 * 60 * 1000);
    const again = await engine.start('act-study', t0 + 4 * 60 * 1000);
    expect(again.status).toBe('paused');
  });

  test('P1: switch to same activity preserves session; different keys serialize', async () => {
    const s = await engine.start('act-deep-work', t0);
    const same = await engine.switchActivity('act-deep-work', t0 + 1000);
    expect(same.id).toBe(s.id);
    const p1 = engine.pause('Break', t0 + 2000);
    const p2 = engine.resume(t0 + 3000);
    await expect(p1).resolves.toBeDefined();
    await expect(p2).resolves.toBeDefined();
  });

  test('P1: three different commands queue in invocation order', async () => {
    const [started, paused, resumed] = await Promise.all([
      engine.start('act-deep-work', t0),
      engine.pause('Break', t0 + 1000),
      engine.resume(t0 + 2000),
    ]);
    expect(started.status).toBe('running');
    expect(paused.status).toBe('paused');
    expect(resumed.status).toBe('running');
    const state = await engine.getCurrentState();
    expect(state.session?.status).toBe('running');
    expect(state.openInterval?.kind).toBe('active');
  });

  test('P1: closed segments of the live session cannot be edited or deleted', async () => {
    await engine.start('act-deep-work', t0);
    await engine.pause('Break', t0 + 20 * 60 * 1000);
    const intervals = await repo.getIntervals();
    const firstActive = intervals.find((i) => i.kind === 'active')!;
    await expect(engine.editInterval(firstActive.id, t0, t0 + 5 * 60 * 1000)).rejects.toThrow(
      'LIVE_SESSION_PROTECTED'
    );
    await expect(engine.deleteInterval(firstActive.id)).rejects.toThrow('LIVE_SESSION_PROTECTED');
  });

  test('P1: editing a completed interval across the live open interval is rejected', async () => {
    // Completed historical record [t0, t0+30m].
    await engine.start('act-deep-work', t0);
    await engine.finish(t0 + 30 * 60 * 1000);
    // Live session starting at t0+60m.
    await engine.start('act-study', t0 + 60 * 60 * 1000);
    clock.setTime(t0 + 65 * 60 * 1000);
    const history = (await repo.getIntervals()).find((i) => i.activityId === 'act-deep-work')!;
    // Stretching history into the live window must fail, not corrupt.
    await expect(
      engine.editInterval(history.id, t0, t0 + 70 * 60 * 1000)
    ).rejects.toThrow('COLLISION_ERROR');
    const unchanged = await repo.getIntervalById(history.id);
    expect(unchanged?.endMs).toBe(t0 + 30 * 60 * 1000);
  });

  test('P1: real sleep writes kind=sleep and wakes with a marker + summary', async () => {
    const sleepAct = (await repo.getActivities(true)).find((a) => a.id === 'act-sleep')!;
    const session = await engine.startSleep(sleepAct.id, t0);
    expect(session.activityId).toBe(sleepAct.id);
    expect(await engine.isSleeping()).toBe(true);
    const state = await engine.getCurrentState();
    expect(state.sleeping).toBe(true);
    expect(state.elapsedSleepMs).toBeGreaterThanOrEqual(0);
    const wake = await engine.wakeUp(t0 + 7 * 3600 * 1000, 'dawn');
    expect(wake.sleptMs).toBe(7 * 3600 * 1000);
    expect(wake.marker.timestampMs).toBe(t0 + 7 * 3600 * 1000);
    expect(await engine.isSleeping()).toBe(false);
    const intervals = await repo.getIntervals();
    expect(intervals.some((i) => i.kind === 'sleep' && i.endMs === t0 + 7 * 3600 * 1000)).toBe(true);
  });

  test('P1: sleep requires explicit finish of an active session first', async () => {
    await engine.start('act-deep-work', t0);
    await expect(engine.startSleep('act-sleep', t0 + 1000)).rejects.toThrow('ACTIVE_SESSION_EXISTS');
  });

  test('P1: getSessions window returns spanning sessions', async () => {
    const from = new Date('2026-09-14T00:00:00.000Z').getTime();
    const to = new Date('2026-09-15T00:00:00.000Z').getTime();
    // Session spanning Mon->Wed must appear for a Tue query.
    await engine.start('act-deep-work', new Date('2026-09-13T12:00:00.000Z').getTime());
    await engine.finish(new Date('2026-09-16T12:00:00.000Z').getTime());
    const inWindow = await repo.getSessions(from, to);
    expect(inWindow.length).toBe(1);
  });

  test('P1: getCurrentSession throws on corrupt duplicates instead of masking', async () => {
    await db.executeSql(
      `INSERT INTO sessions (id, activity_id, status, experience, started_at, ended_at, target_seconds, intention, created_at, updated_at) VALUES ('s1','act-deep-work','running','track',?,NULL,NULL,NULL,?,?);`,
      [t0, t0, t0]
    );
    // Unique index blocks the second open session at the DB layer.
    await expect(
      db.executeSql(
        `INSERT INTO sessions (id, activity_id, status, experience, started_at, ended_at, target_seconds, intention, created_at, updated_at) VALUES ('s2','act-study','running','track',?,NULL,NULL,NULL,?,?);`,
        [t0 + 1, t0 + 1, t0 + 1]
      )
    ).rejects.toThrow();
  });

  test('P1: backup rejects invalid kind/status and multiple open records; restore validates', async () => {
    const good = await repo.exportAllData();
    const badKind = JSON.parse(JSON.stringify(good));
    badKind.data.intervals.push({
      id: 'bad', sessionId: null, activityId: 'act-deep-work', kind: 'nap',
      startMs: t0, endMs: t0 + 1000, reason: null, revision: 1,
    });
    expect(validateBackupData(badKind).isValid).toBe(false);

    const badStatus = JSON.parse(JSON.stringify(good));
    badStatus.data.sessions.push({
      id: 'bad-s', activityId: 'act-deep-work', status: 'napping', experience: 'track',
      startedAt: t0, endedAt: null, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    expect(validateBackupData(badStatus).isValid).toBe(false);

    await expect(repo.restoreAllData(badKind)).rejects.toThrow('INVALID_BACKUP');
    // Valid restore still works.
    await expect(repo.restoreAllData(good)).resolves.toBeUndefined();
  });

  test('P1: backup rejects contradictory session completion timestamps', async () => {
    const awaitableBackup = await repo.exportAllData();
    const clone = () => JSON.parse(JSON.stringify(awaitableBackup));

    const openWithEnd = clone();
    openWithEnd.data.sessions.push({
      id: 'contradictory-open', activityId: 'act-deep-work', status: 'running', experience: 'track',
      startedAt: t0, endedAt: t0 + 1000, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    openWithEnd.data.intervals.push({
      id: 'contradictory-open-interval', sessionId: 'contradictory-open', activityId: 'act-deep-work',
      kind: 'active', startMs: t0, endMs: null, reason: null, revision: 1,
    });
    expect(validateBackupData(openWithEnd).isValid).toBe(false);

    const completedWithoutEnd = clone();
    completedWithoutEnd.data.sessions.push({
      id: 'contradictory-complete', activityId: 'act-deep-work', status: 'completed', experience: 'track',
      startedAt: t0, endedAt: null, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    expect(validateBackupData(completedWithoutEnd).isValid).toBe(false);
  });

  test('P1: a future day contains only future time, never a live interval projection', async () => {
    await engine.start('act-deep-work', t0);
    const futureDate = '2026-09-15';
    const accounting = computeDayAccounting(
      futureDate,
      t0,
      await repo.getIntervals(),
      await repo.getSessions(),
      await repo.getActivities(true),
      await repo.getCategories()
    );
    expect(accounting.intervals).toHaveLength(0);
    expect(accounting.accountedActiveMs).toBe(0);
    expect(accounting.untrackedMs).toBe(0);
    expect(accounting.futureMs).toBe(accounting.totalDaySpanMs);
  });

  test('P1: overlapping intervals partition elapsed time exactly (precedence: sleep > active > pause)', async () => {
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);
    const overlapping = [
      { id: 'a', sessionId: null, activityId: 'act-deep-work', kind: 'active' as const, startMs: t0, endMs: t0 + 3600000, reason: null, revision: 1 },
      { id: 'b', sessionId: null, activityId: 'act-study', kind: 'active' as const, startMs: t0 + 1800000, endMs: t0 + 5400000, reason: null, revision: 1 },
    ];
    const accounting = computeDayAccounting(
      '2026-09-14', t0 + 5400000, overlapping, [], activities, categories, t0
    );
    const elapsed = 5400000;
    // Exact partition: no bucket may inflate beyond elapsed.
    expect(
      accounting.accountedActiveMs + accounting.accountedPauseMs + accounting.accountedSleepMs + accounting.untrackedMs
    ).toBe(elapsed);
    expect(accounting.untrackedMs).toBe(0);
    // Winner attribution: earliest-starting active owns the overlap.
    expect(accounting.accountedActiveMs).toBe(elapsed);
    const deepWork = accounting.categoryTotals.find((c) => c.categoryId === 'cat-focused');
    const study = accounting.categoryTotals.find((c) => c.categoryId === 'cat-study');
    expect((deepWork?.totalMs ?? 0) + (study?.totalMs ?? 0)).toBe(elapsed);
  });

  test('P1: sleep wins attribution over overlapping active time', async () => {
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);
    const overlapping = [
      { id: 'a', sessionId: null, activityId: 'act-deep-work', kind: 'active' as const, startMs: t0, endMs: t0 + 3600000, reason: null, revision: 1 },
      { id: 's', sessionId: null, activityId: 'act-sleep', kind: 'sleep' as const, startMs: t0 + 1800000, endMs: t0 + 5400000, reason: null, revision: 1 },
    ];
    const accounting = computeDayAccounting(
      '2026-09-14', t0 + 5400000, overlapping, [], activities, categories, t0
    );
    expect(
      accounting.accountedActiveMs + accounting.accountedPauseMs + accounting.accountedSleepMs + accounting.untrackedMs
    ).toBe(5400000);
    expect(accounting.accountedSleepMs).toBe(3600000);
    expect(accounting.accountedActiveMs).toBe(1800000);
  });

  test('P1: invalid local date throws instead of NaN accounting', async () => {
    expect(() => getLocalDayBounds('not-a-date')).toThrow('INVALID_DATE');
  });

  test('Circle: decline/cancel/unblock lifecycle; unfriend preserves identity; tier defaults differ', async () => {
    const now = Date.now();
    const req = requestFriendship('a', 'b', now);
    expect(declineFriendship(req, 'b', now + 1).state).toBe('none');
    expect(cancelFriendshipRequest(req, 'a', now + 1).state).toBe('none');
    const blocked = blockRelationship({ ...req, state: 'friend' }, 'a', now + 2);
    expect(blocked.state).toBe('blocked');
    expect(unblockRelationship(blocked, 'a', now + 3).state).toBe('none');
    const rel = { ...req, state: 'friend' as const };
    const unf = unfriend(rel, 'a', now + 4);
    expect(unf.requesterId).toBe('a');
    expect(unf.recipientId).toBe('b');
    const friendPolicy = createDefaultSharePolicy('o', 'v', 'friend', now);
    const closePolicy = createDefaultSharePolicy('o', 'v2', 'close-friend', now);
    expect(closePolicy.fields).toContain('intentions');
    expect(friendPolicy.fields).not.toContain('activityNames');
    const accepted = acceptFriendship(req, 'b', now + 5);
    expect(accepted.state).toBe('friend');
  });

  test('Circle: snapshot owner must be the relationship other party', async () => {
    const now = Date.now();
    // Owner o shares with viewer v; friendship is o<->v.
    const friendship = acceptFriendship(requestFriendship('o', 'v', now), 'v', now + 1);
    const policy = createDefaultSharePolicy('o', 'v', 'friend', now + 2);
    const snapshot = buildDailyShareSnapshot(policy, '2026-09-14', now + 3, { status: 'Focusing' });
    expect(
      authorizeSnapshotRead({ relationship: friendship, policy, snapshot, viewerId: 'v' }).status
    ).toBe('Focusing');
    // An unrelated friendship (v<->stranger) must NOT authorize o's snapshot,
    // even though v is a party to it.
    const unrelated = acceptFriendship(requestFriendship('v', 'stranger', now), 'stranger', now + 1);
    expect(() =>
      authorizeSnapshotRead({ relationship: unrelated, policy, snapshot, viewerId: 'v' })
    ).toThrow('SHARE_ACCESS_DENIED');
  });

  test('Backup: contradictory live states are rejected', async () => {
    const good = await repo.exportAllData();
    const clone = () => JSON.parse(JSON.stringify(good));

    // Open session without its open interval.
    const noOpen = clone();
    noOpen.data.sessions.push({
      id: 'live-1', activityId: 'act-deep-work', status: 'running', experience: 'track',
      startedAt: t0, endedAt: null, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    expect(validateBackupData(noOpen).isValid).toBe(false);

    // Completed session owning an open interval.
    const completedOpen = clone();
    completedOpen.data.sessions.push({
      id: 'done-1', activityId: 'act-deep-work', status: 'completed', experience: 'track',
      startedAt: t0, endedAt: t0 + 1000, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    completedOpen.data.intervals.push({
      id: 'inv-open', sessionId: 'done-1', activityId: 'act-deep-work', kind: 'active',
      startMs: t0, endMs: null, reason: null, revision: 1,
    });
    expect(validateBackupData(completedOpen).isValid).toBe(false);

    // Open interval kind contradicting a paused session.
    const mismatch = clone();
    mismatch.data.sessions.push({
      id: 'live-2', activityId: 'act-deep-work', status: 'paused', experience: 'track',
      startedAt: t0, endedAt: null, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    mismatch.data.intervals.push({
      id: 'inv-open-2', sessionId: 'live-2', activityId: 'act-deep-work', kind: 'active',
      startMs: t0, endMs: null, reason: null, revision: 1,
    });
    expect(validateBackupData(mismatch).isValid).toBe(false);

    // Missing settings payload.
    const noSettings = clone();
    delete noSettings.data.settings;
    expect(validateBackupData(noSettings).isValid).toBe(false);

    // Session-less non-manual interval.
    const orphanKind = clone();
    orphanKind.data.intervals.push({
      id: 'inv-orphan', sessionId: null, activityId: 'act-deep-work', kind: 'active',
      startMs: t0, endMs: t0 + 1000, reason: null, revision: 1,
    });
    expect(validateBackupData(orphanKind).isValid).toBe(false);

    // A coherent open session still validates.
    const coherent = clone();
    coherent.data.sessions.push({
      id: 'live-3', activityId: 'act-deep-work', status: 'running', experience: 'track',
      startedAt: t0, endedAt: null, targetSeconds: null, intention: null, createdAt: t0, updatedAt: t0,
    });
    coherent.data.intervals.push({
      id: 'inv-open-3', sessionId: 'live-3', activityId: 'act-deep-work', kind: 'active',
      startMs: t0, endMs: null, reason: null, revision: 1,
    });
    expect(validateBackupData(coherent).isValid).toBe(true);
  });

  test('Schema repair: duplicates resolve to one consistent open session', async () => {
    const { SqlJsAdapter: FreshAdapter } = await import('../src/data/sqlJsAdapter');
    const { initializeDatabase: initDb } = await import('../src/data/schema');
    const fresh = await FreshAdapter.create();
    try {
      // Seed, then inject corruption directly: two open sessions, an open
      // interval on a completed session, and an orphaned extra open interval.
      await initDb(fresh);
      // Drop the guard indexes so the corrupt fixture can be constructed;
      // the second initDb run must repair before recreating them.
      await fresh.executeSql(`DROP INDEX IF EXISTS idx_single_current_session;`);
      await fresh.executeSql(`DROP INDEX IF EXISTS idx_single_open_interval;`);
      await fresh.executeSql(
        `INSERT INTO sessions (id, activity_id, status, experience, started_at, ended_at, target_seconds, intention, created_at, updated_at) VALUES ('old-live','act-deep-work','running','track',?,NULL,NULL,NULL,?,?);`,
        [t0, t0, t0]
      );
      await fresh.executeSql(
        `INSERT INTO intervals (id, session_id, activity_id, kind, start_ms, end_ms, reason, revision) VALUES ('old-open','old-live','act-deep-work','active',?,NULL,NULL,1);`,
        [t0]
      );
      await fresh.executeSql(
        `INSERT INTO sessions (id, activity_id, status, experience, started_at, ended_at, target_seconds, intention, created_at, updated_at) VALUES ('new-live','act-study','paused','track',?,NULL,NULL,NULL,?,?);`,
        [t0 + 3600000, t0 + 3600000, t0 + 3600000]
      );
      await fresh.executeSql(
        `INSERT INTO intervals (id, session_id, activity_id, kind, start_ms, end_ms, reason, revision) VALUES ('new-open','new-live','act-study','pause',?,NULL,'Break',1);`,
        [t0 + 3600000]
      );
      // Re-run init: repair must converge without throwing.
      await initDb(fresh);
      const openSessions = await fresh.executeSql(
        `SELECT id, status, started_at, ended_at FROM sessions WHERE status IN ('running','paused');`
      );
      expect(openSessions.rows.length).toBe(1);
      expect(String(openSessions.rows[0].id)).toBe('new-live');
      expect(String(openSessions.rows[0].status)).toBe('paused');
      const opens = await fresh.executeSql(`SELECT id, session_id, start_ms, end_ms FROM intervals WHERE end_ms IS NULL;`);
      expect(opens.rows.length).toBe(1);
      expect(String(opens.rows[0].session_id)).toBe('new-live');
      // Repaired older session ends at or after all its intervals.
      const repaired = await fresh.executeSql(`SELECT ended_at FROM sessions WHERE id = 'old-live';`);
      expect(Number(repaired.rows[0].ended_at)).toBeGreaterThanOrEqual(t0 + 1);
      const repairedInvs = await fresh.executeSql(`SELECT MAX(end_ms) AS maxEnd FROM intervals WHERE session_id = 'old-live';`);
      expect(Number(repaired.rows[0].ended_at)).toBeGreaterThanOrEqual(Number(repairedInvs.rows[0].maxEnd));
    } finally {
      await fresh.close();
    }
  });

  test('Notifications: hourly/daily caps and day reset', async () => {
    const base = { dayKey: '2026-09-14', countToday: 0, lastScheduledAtMs: 0, scheduledIds: [] as string[] };
    expect(canDeliverReminder(t0, base).allowed).toBe(true);
    const afterOne = nextDeliveryRecord(t0, { ...base }, 'id1');
    expect(canDeliverReminder(t0 + 10 * 60 * 1000, afterOne).allowed).toBe(false);
    expect(canDeliverReminder(t0 + 61 * 60 * 1000, afterOne).allowed).toBe(true);
    const full = { ...afterOne, countToday: 4 };
    expect(canDeliverReminder(t0 + 5 * 3600 * 1000, full).reason).toBe('DAILY_CAP');
    const nextDay = t0 + 24 * 3600 * 1000;
    expect(canDeliverReminder(nextDay, full).allowed).toBe(true);
    // Legacy records carrying only lastDeliveredAtMs are still honored.
    expect(canDeliverReminder(t0 + 10 * 60 * 1000, { dayKey: '2026-09-14', countToday: 0, lastDeliveredAtMs: t0, scheduledIds: [] }).allowed).toBe(false);
  });

  test('Notifications: replacement of a pending reminder consumes no quota; caps checked first', async () => {
    const record = { dayKey: '2026-09-14', countToday: 1, lastScheduledAtMs: t0, scheduledIds: ['old-id'] };
    // Still-pending tracked reminder → replacement bypasses the hourly cap it caused.
    const replace = decideReminderSchedule(t0 + 10 * 60 * 1000, record, ['old-id']);
    expect(replace.action).toBe('allow-replace');
    const afterReplace = nextDeliveryRecord(t0 + 10 * 60 * 1000, record, 'new-id', 1);
    expect(afterReplace.countToday).toBe(1);
    // No pending reminder → hourly cap denies without cancelling anything.
    const deny = decideReminderSchedule(t0 + 10 * 60 * 1000, { ...record, scheduledIds: [] }, []);
    expect(deny).toEqual({ action: 'deny', reason: 'HOURLY_CAP' });
    // Daily cap denies even when a replacement is pending.
    const dailyDeny = decideReminderSchedule(t0 + 61 * 60 * 1000, { ...record, countToday: 4 }, ['old-id']);
    expect(dailyDeny).toEqual({ action: 'deny', reason: 'DAILY_CAP' });
  });

  test('Notifications: tap handler resolves current truth AND navigates', async () => {
    const seen: string[] = [];
    const handleTap = createReminderTapHandler(() => '/(tabs)', (route) => seen.push(route));
    handleTap();
    expect(seen).toEqual(['/(tabs)']);
  });

  test('Living Day: phases are mutually exclusive; widget contract is read-only truth', async () => {
    const now = Date.now();
    const idle = deriveLivingDayState({
      session: null, openInterval: null, elapsedActiveMs: 0, elapsedPauseMs: 0,
      elapsedSleepMs: 0, totalElapsedMs: 0, dayStartMs: now - 3600000, dayEndMs: now + 3600000, nowMs: now,
    });
    expect(idle.phase).toBe('idle');
    const sleeping = deriveLivingDayState({
      session: { id: 's', activityId: 'act-sleep', status: 'running', experience: 'track', startedAt: now - 1000, endedAt: null, targetSeconds: null, intention: null, createdAt: now - 1000, updatedAt: now },
      openInterval: { id: 'i', sessionId: 's', activityId: 'act-sleep', kind: 'sleep', startMs: now - 1000, endMs: null, reason: null, revision: 1 },
      elapsedActiveMs: 0, elapsedPauseMs: 0, elapsedSleepMs: 1000, totalElapsedMs: 1000,
      dayStartMs: now - 3600000, dayEndMs: now + 3600000, nowMs: now,
    });
    expect(sleeping.phase).toBe('sleeping');
    const widget = buildWidgetState({
      phase: 'sleeping', activityName: 'Sleep', experience: 'track',
      elapsedActiveMs: 0, remainingMs: 0, overtimeMs: 0, sleeping: true, nowMs: now,
    });
    expect(widget.deepLink).toContain('sleep');
  });

  test('Wake summary does not round a real short sleep down to zero', () => {
    expect(formatSleptSummary(12_000)).toBe('Less than a minute of sleep recorded');
    expect(formatSleptSummary(90_000)).toBe('2 min of sleep recorded');
  });
});
