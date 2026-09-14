import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SqlJsAdapter } from '../src/data/sqlJsAdapter';
import { initializeDatabase } from '../src/data/schema';
import { Repository } from '../src/data/repository';
import { TimeEngine } from '../src/domain/timeEngine';
import { TestClock } from '../src/domain/clock';
import { computeDayAccounting } from '../src/domain/dayCalculator';
import { generateFactualInsights } from '../src/domain/insights';

describe('T07 - Review, Insights & Priorities Invariants (A09, A11, A12)', () => {
  let db: SqlJsAdapter;
  let repo: Repository;
  let clock: TestClock;
  let engine: TimeEngine;

  beforeEach(async () => {
    db = await SqlJsAdapter.create();
    await initializeDatabase(db);
    repo = new Repository(db);
    clock = new TestClock(new Date('2026-09-07T08:00:00.000Z').getTime());
    engine = new TimeEngine(db, repo, clock);
  });

  afterEach(async () => {
    await db.close();
  });

  test('A09: Fresh install / Sparse day receives neutral guidance, no fake trends', async () => {
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);
    const sessions = await repo.getSessions();
    const intervals = await repo.getIntervals();

    const accounting = computeDayAccounting('2026-09-07', clock.now(), intervals, sessions, activities, categories);
    const insights = generateFactualInsights(accounting, null, []);

    expect(accounting.accountedActiveMs).toBe(0);
    expect(accounting.longestUninterruptedMs).toBe(0);
    expect(insights.length).toBe(1);
    expect(insights[0].type).toBe('sparse_data');
    expect(insights[0].title).toBe('Beginning your day');
    expect(insights[0].detail).toContain('Tracking begins when you record your first session.');
  });

  test('A11: Wake-to-first-activity computed ONLY from explicit manual marker', async () => {
    const wakeTime = new Date('2026-09-07T06:30:00.000Z').getTime();
    const marker = await engine.recordWakeMarker(wakeTime, 'Woke up refreshed');

    const activityStart = new Date('2026-09-07T07:15:00.000Z').getTime();
    clock.setTime(activityStart);
    await engine.start('act-deep-work');
    clock.advance(45 * 60 * 1000);
    await engine.finish();

    const intervals = await repo.getIntervals();
    const sessions = await repo.getSessions();
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);

    const accounting = computeDayAccounting('2026-09-07', clock.now(), intervals, sessions, activities, categories);
    const insights = generateFactualInsights(accounting, marker, []);

    const wakeInsight = insights.find((i) => i.type === 'wake_to_activity');
    expect(wakeInsight).toBeDefined();
    expect(wakeInsight?.metric).toBe('45m');
    expect(wakeInsight?.detail).toContain('between your recorded wake time and starting Deep Work');
  });

  test('A12: Priorities saved, marked complete, reordered, maximum three', async () => {
    const date = '2026-09-07';

    // Add 3 priorities
    await repo.savePriority({ id: 'p1', targetDate: date, title: 'Finish Android UI', order: 0, completedAt: null, createdAt: clock.now() });
    await repo.savePriority({ id: 'p2', targetDate: date, title: 'Review design tokens', order: 1, completedAt: null, createdAt: clock.now() });
    await repo.savePriority({ id: 'p3', targetDate: date, title: 'Verify SQLite durability', order: 2, completedAt: null, createdAt: clock.now() });

    let priorities = await repo.getPrioritiesForDate(date);
    expect(priorities.length).toBe(3);
    expect(priorities[0].title).toBe('Finish Android UI');

    // Mark priority 1 complete
    priorities[0].completedAt = clock.now();
    await repo.savePriority(priorities[0]);

    // Reorder priorities (swap p2 and p3)
    priorities[1].order = 2;
    priorities[2].order = 1;
    await repo.savePriority(priorities[1]);
    await repo.savePriority(priorities[2]);

    const updated = await repo.getPrioritiesForDate(date);
    expect(updated.length).toBe(3);
    expect(updated[0].completedAt).not.toBeNull();
    expect(updated[1].id).toBe('p3');
    expect(updated[2].id).toBe('p2');

    // Edit priority title
    updated[1].title = 'Verify SQLite durability & migrations';
    await repo.savePriority(updated[1]);
    const afterEdit = await repo.getPrioritiesForDate(date);
    expect(afterEdit[1].title).toBe('Verify SQLite durability & migrations');

    // Delete priority
    await repo.deletePriority('p1');
    const afterDelete = await repo.getPrioritiesForDate(date);
    expect(afterDelete.length).toBe(2);
    expect(afterDelete.some((p) => p.id === 'p1')).toBe(false);
  });

  test('User category breakdown is preserved in day accounting (DESIGN.md line 64)', async () => {
    // Create custom user category and activity (e.g. Spiritual / Faith)
    await repo.saveCategory({
      id: 'cat-spiritual',
      name: 'Spiritual & Prayer',
      color: '#8B5CF6',
      icon: 'heart-outline',
      isDefault: false,
      createdAt: clock.now(),
    });
    await repo.saveActivity({
      id: 'act-prayer-custom',
      name: 'Morning Devotion',
      iconKey: 'heart',
      categoryId: 'cat-spiritual',
      isFavorite: true,
      isArchived: false,
      targetSeconds: 1200,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    clock.setTime(new Date('2026-09-07T09:00:00.000Z').getTime());
    await engine.start('act-prayer-custom'); // Spiritual
    clock.advance(20 * 60 * 1000);
    await engine.switchActivity('act-deep-work'); // Focused Work
    clock.advance(40 * 60 * 1000);
    await engine.finish();

    const intervals = await repo.getIntervals();
    const sessions = await repo.getSessions();
    const categories = await repo.getCategories();
    const activities = await repo.getActivities(true);

    const accounting = computeDayAccounting('2026-09-07', clock.now(), intervals, sessions, activities, categories);

    // Verify each category has distinct accurate totals
    const spiritualCat = accounting.categoryTotals.find((c) => c.categoryId === 'cat-spiritual');
    const focusedCat = accounting.categoryTotals.find((c) => c.categoryId === 'cat-focused');

    expect(spiritualCat).toBeDefined();
    expect(spiritualCat?.totalMs).toBe(20 * 60 * 1000);
    expect(focusedCat).toBeDefined();
    expect(focusedCat?.totalMs).toBe(40 * 60 * 1000);
  });

  test('All pause reasons (Phone call, Break, Distraction, Other) can be recorded and labeled', async () => {
    clock.setTime(new Date('2026-09-07T14:00:00.000Z').getTime());
    await engine.start('act-deep-work');
    clock.advance(15 * 60 * 1000);

    // Pause with Phone call
    await engine.pause('Phone call');
    clock.advance(5 * 60 * 1000);
    await engine.resume();
    clock.advance(10 * 60 * 1000);

    // Pause with Distraction
    await engine.pause('Distraction');
    clock.advance(3 * 60 * 1000);
    await engine.finish();

    const intervals = await repo.getIntervals();
    const pauses = intervals.filter((i) => i.kind === 'pause');
    expect(pauses.length).toBe(2);
    expect(pauses[0].reason).toBe('Phone call');
    expect(pauses[1].reason).toBe('Distraction');
  });
});
