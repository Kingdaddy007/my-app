import { IDatabaseAdapter } from './dbAdapter';
import { Activity, ActivityCategory, UserSettings } from '../domain/types';

export const SCHEMA_VERSION = 1;

export const INITIAL_CATEGORIES: ActivityCategory[] = [
  { id: 'cat-focused', name: 'Focused Work', color: '#087A59', icon: 'briefcase-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-rest', name: 'Rest & Recovery', color: '#3B82F6', icon: 'cafe-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-study', name: 'Study & Reading', color: '#10B981', icon: 'book-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-health', name: 'Health & Movement', color: '#EF4444', icon: 'barbell-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-life', name: 'Life & Essentials', color: '#F59E0B', icon: 'home-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-sleep', name: 'Sleep', color: '#6366F1', icon: 'moon-outline', isDefault: true, createdAt: 1700000000000 },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'act-deep-work', name: 'Deep Work', iconKey: 'laptop', categoryId: 'cat-focused', isFavorite: true, isArchived: false, targetSeconds: 1500, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-study', name: 'Study', iconKey: 'book', categoryId: 'cat-study', isFavorite: true, isArchived: false, targetSeconds: 1800, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-prayer', name: 'Prayer & Reflection', iconKey: 'heart', categoryId: 'cat-study', isFavorite: true, isArchived: false, targetSeconds: 1200, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-trading', name: 'Market Analysis', iconKey: 'trending-up', categoryId: 'cat-focused', isFavorite: true, isArchived: false, targetSeconds: 2700, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-exercise', name: 'Exercise', iconKey: 'fitness', categoryId: 'cat-health', isFavorite: false, isArchived: false, targetSeconds: 2700, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-cleaning', name: 'Cleaning & Home', iconKey: 'sparkles', categoryId: 'cat-life', isFavorite: false, isArchived: false, targetSeconds: 1800, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-rest', name: 'Rest', iconKey: 'cafe', categoryId: 'cat-rest', isFavorite: false, isArchived: false, targetSeconds: 900, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { id: 'act-sleep', name: 'Sleep', iconKey: 'moon', categoryId: 'cat-sleep', isFavorite: false, isArchived: false, targetSeconds: 28800, createdAt: 1700000000000, updatedAt: 1700000000000 },
];

export const DEFAULT_SETTINGS: UserSettings = {
  profileName: null,
  themePreference: 'system',
  timeFormat: '12h',
  remindersEnabled: false,
  pauseReminderMinutes: 10,
  idleReminderMinutes: 30,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  privacyMode: true,
  hapticsEnabled: true,
  reducedMotion: false,
  hasCompletedOnboarding: false,
  lastWakeMarkerMs: null,
};

export async function initializeDatabase(db: IDatabaseAdapter): Promise<void> {
  await db.transaction(async (tx) => {
    // Categories
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    // Activities
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon_key TEXT NOT NULL,
        category_id TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        target_seconds INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
    `);

    // Sessions
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        target_seconds INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (activity_id) REFERENCES activities(id)
      );
    `);

    // Intervals
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS intervals (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        activity_id TEXT,
        kind TEXT NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER,
        reason TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_id) REFERENCES activities(id)
      );
    `);

    // Wake markers
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS wake_markers (
        id TEXT PRIMARY KEY,
        timestamp_ms INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        note TEXT
      );
    `);

    // Priorities
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS priorities (
        id TEXT PRIMARY KEY,
        target_date TEXT NOT NULL,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        activity_id TEXT,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (activity_id) REFERENCES activities(id)
      );
    `);

    // Settings
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Schema version
    await tx.executeSql(`
      CREATE TABLE IF NOT EXISTS schema_info (
        version INTEGER PRIMARY KEY
      );
    `);

    // Indexes
    await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_intervals_start ON intervals(start_ms);`);
    await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_intervals_session ON intervals(session_id);`);
    await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);`);
    await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_priorities_date ON priorities(target_date);`);

    // Seed default categories if none exist
    const catCheck = await tx.executeSql(`SELECT COUNT(*) as count FROM categories;`);
    if (catCheck.rows[0]?.count === 0) {
      for (const cat of INITIAL_CATEGORIES) {
        await tx.executeSql(
          `INSERT INTO categories (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
          [cat.id, cat.name, cat.color, cat.icon, cat.isDefault ? 1 : 0, cat.createdAt]
        );
      }
      for (const act of INITIAL_ACTIVITIES) {
        await tx.executeSql(
          `INSERT INTO activities (id, name, icon_key, category_id, is_favorite, is_archived, target_seconds, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [act.id, act.name, act.iconKey, act.categoryId, act.isFavorite ? 1 : 0, act.isArchived ? 1 : 0, act.targetSeconds ?? null, act.createdAt, act.updatedAt]
        );
      }
    }

    // Seed default settings if empty
    const setCheck = await tx.executeSql(`SELECT COUNT(*) as count FROM settings;`);
    if (setCheck.rows[0]?.count === 0) {
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
        await tx.executeSql(`INSERT INTO settings (key, value) VALUES (?, ?);`, [k, JSON.stringify(v)]);
      }
    }
  });
}
