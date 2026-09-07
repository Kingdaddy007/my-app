import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SqlJsAdapter } from '../src/data/sqlJsAdapter';
import { initializeDatabase } from '../src/data/schema';
import { Repository } from '../src/data/repository';

describe('T04 - Onboarding & Activities Invariants', () => {
  let db1: SqlJsAdapter;
  let repo1: Repository;
  let db2: SqlJsAdapter;
  let repo2: Repository;

  beforeEach(async () => {
    db1 = await SqlJsAdapter.create();
    await initializeDatabase(db1);
    repo1 = new Repository(db1);

    db2 = await SqlJsAdapter.create();
    await initializeDatabase(db2);
    repo2 = new Repository(db2);
  });

  afterEach(async () => {
    await db1.close();
    await db2.close();
  });

  test('Two independent installations configure completely independent activities without accounts', async () => {
    // Installation 1 (e.g. Beloved)
    await repo1.updateSettings({ profileName: 'Beloved', themePreference: 'dark', hasCompletedOnboarding: true });
    await repo1.saveActivity({
      id: 'act-1-custom',
      name: 'Scripture Meditation',
      iconKey: 'heart',
      categoryId: 'cat-study',
      isFavorite: true,
      isArchived: false,
      targetSeconds: 1800,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Installation 2 (e.g. Sibling)
    await repo2.updateSettings({ profileName: 'Alex', themePreference: 'light', hasCompletedOnboarding: true });
    await repo2.saveActivity({
      id: 'act-2-custom',
      name: 'Piano Practice',
      iconKey: 'sparkles',
      categoryId: 'cat-life',
      isFavorite: false,
      isArchived: false,
      targetSeconds: 2700,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Verify isolation
    const settings1 = await repo1.getSettings();
    const settings2 = await repo2.getSettings();
    expect(settings1.profileName).toBe('Beloved');
    expect(settings1.themePreference).toBe('dark');
    expect(settings2.profileName).toBe('Alex');
    expect(settings2.themePreference).toBe('light');

    const acts1 = await repo1.getActivities();
    const acts2 = await repo2.getActivities();
    expect(acts1.some((a) => a.name === 'Scripture Meditation')).toBe(true);
    expect(acts1.some((a) => a.name === 'Piano Practice')).toBe(false);
    expect(acts2.some((a) => a.name === 'Piano Practice')).toBe(true);
    expect(acts2.some((a) => a.name === 'Scripture Meditation')).toBe(false);
  });

  test('Archive activity preserves existing history and removes from active list', async () => {
    const initial = await repo1.getActivities(false);
    const deepWork = initial.find((a) => a.id === 'act-deep-work')!;
    expect(deepWork).toBeDefined();

    // Archive deep work
    await repo1.archiveActivity(deepWork.id);

    const activeList = await repo1.getActivities(false);
    expect(activeList.some((a) => a.id === 'act-deep-work')).toBe(false);

    const fullList = await repo1.getActivities(true);
    expect(fullList.some((a) => a.id === 'act-deep-work' && a.isArchived)).toBe(true);
  });
});
