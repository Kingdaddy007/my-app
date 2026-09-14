import { IDatabaseAdapter } from './dbAdapter';
import { Activity, ActivityCategory, UserSettings } from '../domain/types';

export const SCHEMA_VERSION = 3;

export const INITIAL_CATEGORIES: ActivityCategory[] = [
  { id: 'cat-focused', name: 'Focused Work', color: '#91A7FF', icon: 'briefcase-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-rest', name: 'Rest & Recovery', color: '#FFAD68', icon: 'cafe-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-study', name: 'Study & Reading', color: '#C4A7FF', icon: 'book-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-health', name: 'Health & Movement', color: '#FF7A86', icon: 'barbell-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-life', name: 'Life & Essentials', color: '#F0B45D', icon: 'home-outline', isDefault: true, createdAt: 1700000000000 },
  { id: 'cat-sleep', name: 'Sleep', color: '#7C8CF8', icon: 'moon-outline', isDefault: true, createdAt: 1700000000000 },
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
  focusTargetReminderEnabled: false,
  hasCompletedOnboarding: false,
  onboardingStep: 1,
  trackingAwarenessStartedAtMs: null,
  lastWakeMarkerMs: null,
};

export async function initializeDatabase(db: IDatabaseAdapter): Promise<void> {
  // Enforce declared foreign keys on every connection. Without this, orphan
  // sessions/intervals are silently insertable despite FOREIGN KEY clauses.
  try {
    await db.executeSql(`PRAGMA foreign_keys = ON;`);
  } catch {
    // sql.js may ignore per-connection pragmas; repository validation still guards.
  }
  try {
    await db.executeSql(`PRAGMA journal_mode = WAL;`);
  } catch {
    // WASM/memory adapters may not support WAL; durability still holds via transactions.
  }
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
        experience TEXT NOT NULL DEFAULT 'track',
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        target_seconds INTEGER,
        intention TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (activity_id) REFERENCES activities(id)
      );
    `);

    // Version 2 session metadata. PRAGMA-based guards keep existing alpha data intact.
    const sessionColumns = await tx.executeSql(`PRAGMA table_info(sessions);`);
    const sessionColumnNames = new Set(sessionColumns.rows.map((row) => String(row.name)));
    if (!sessionColumnNames.has('experience')) {
      await tx.executeSql(`ALTER TABLE sessions ADD COLUMN experience TEXT NOT NULL DEFAULT 'track';`);
      await tx.executeSql(`UPDATE sessions SET experience = 'focus' WHERE target_seconds IS NOT NULL;`);
    }
    if (!sessionColumnNames.has('intention')) {
      await tx.executeSql(`ALTER TABLE sessions ADD COLUMN intention TEXT;`);
    }

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
    // Repair legacy corruption BEFORE creating the partial unique indexes, so
    // a previously corrupted alpha database cannot brick startup on CREATE
    // INDEX. Every repair step preserves the invariant that no session ends
    // before any of its intervals, and that the surviving open session (if
    // any) owns exactly one open interval of a matching kind.
    try {
      const nowMs = Date.now();
      const sessionEndFor = async (sessionId: string, startedAt: number): Promise<number> => {
        const invs = await tx.executeSql(
          `SELECT start_ms, end_ms FROM intervals WHERE session_id = ?;`,
          [sessionId]
        );
        let maxEnd = Number(startedAt) + 1;
        for (const inv of invs.rows as Array<{ start_ms: number; end_ms: number | null }>) {
          maxEnd = Math.max(maxEnd, Number(inv.start_ms) + 1);
          if (inv.end_ms != null) maxEnd = Math.max(maxEnd, Number(inv.end_ms));
        }
        return maxEnd;
      };

      const dupes = await tx.executeSql(
        `SELECT id, started_at FROM sessions WHERE status IN ('running', 'paused') ORDER BY started_at DESC;`
      );
      const dupeList = (dupes.rows as Array<{ id: string; started_at: number }>) ?? [];
      const survivorId = dupeList.length > 0 ? String(dupeList[0].id) : null;
      if (dupeList.length > 1) {
        const [, ...older] = dupeList;
        for (const row of older) {
          const openInvs = await tx.executeSql(
            `SELECT id, start_ms FROM intervals WHERE session_id = ? AND end_ms IS NULL;`,
            [row.id]
          );
          for (const inv of openInvs.rows as Array<{ id: string; start_ms: number }>) {
            await tx.executeSql(`UPDATE intervals SET end_ms = ? WHERE id = ?;`, [
              Number(inv.start_ms) + 1,
              inv.id,
            ]);
          }
          // endedAt covers every interval of the session, never precedes one.
          const endedAt = await sessionEndFor(String(row.id), Number(row.started_at));
          await tx.executeSql(
            `UPDATE sessions SET status = 'completed', ended_at = ?, updated_at = ? WHERE id = ?;`,
            [endedAt, nowMs, row.id]
          );
        }
      }

      // Close open intervals that do not belong to the surviving session, and
      // any open interval on a completed session. Never pick a survivor open
      // interval independently of its session.
      const allOpen = await tx.executeSql(
        `SELECT id, session_id, start_ms, kind FROM intervals WHERE end_ms IS NULL ORDER BY start_ms DESC;`
      );
      const openRows = (allOpen.rows as Array<{ id: string; session_id: string | null; start_ms: number; kind: string }>) ?? [];
      for (const inv of openRows) {
        const belongsToSurvivor = survivorId != null && inv.session_id === survivorId;
        if (!belongsToSurvivor) {
          await tx.executeSql(`UPDATE intervals SET end_ms = ? WHERE id = ?;`, [
            Number(inv.start_ms) + 1,
            inv.id,
          ]);
        }
      }
      // Re-read the survivor's remaining open interval after the sweep.
      if (survivorId) {
        const survivorOpen = await tx.executeSql(
          `SELECT id, kind, start_ms FROM intervals WHERE session_id = ? AND end_ms IS NULL;`,
          [survivorId]
        );
        const survivorRows = (survivorOpen.rows as Array<{ id: string; kind: string; start_ms: number }>) ?? [];
        if (survivorRows.length === 0) {
          // An open session without an open interval is invalid: complete it
          // honestly at its own last instant rather than leaving an orphan.
          const survivor = dupeList[0];
          const endedAt = await sessionEndFor(survivorId, Number(survivor.started_at));
          await tx.executeSql(
            `UPDATE sessions SET status = 'completed', ended_at = ?, updated_at = ? WHERE id = ?;`,
            [endedAt, nowMs, survivorId]
          );
        } else {
          if (survivorRows.length > 1) {
            // Keep the latest open interval; close the rest at their starts.
            const ordered = [...survivorRows].sort((a, b) => Number(b.start_ms) - Number(a.start_ms));
            for (const stale of ordered.slice(1)) {
              await tx.executeSql(`UPDATE intervals SET end_ms = ? WHERE id = ?;`, [
                Number(stale.start_ms) + 1,
                stale.id,
              ]);
            }
            survivorRows.splice(0, survivorRows.length, ordered[0]);
          }
          // Normalize status to the surviving open kind (active/sleep run, pause pauses).
          const kind = String(survivorRows[0].kind);
          const status = kind === 'pause' ? 'paused' : 'running';
          await tx.executeSql(`UPDATE sessions SET status = ?, ended_at = NULL, updated_at = ? WHERE id = ?;`, [
            status,
            nowMs,
            survivorId,
          ]);
        }
      }
    } catch {
      // Repair is best-effort; index creation below still enforces the invariant.
    }
    await tx.executeSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_single_current_session
       ON sessions ((1)) WHERE status IN ('running', 'paused');`
    );
    await tx.executeSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_single_open_interval
       ON intervals ((1)) WHERE end_ms IS NULL;`
    );
    await tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_priorities_date ON priorities(target_date);`);
    await tx.executeSql(`INSERT OR REPLACE INTO schema_info (version) VALUES (?);`, [SCHEMA_VERSION]);

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

    // Version 3 visual migration. Only replace untouched legacy defaults;
    // any category a user recolored remains exactly as they chose it.
    const legacyCategoryColors: Array<[string, string, string]> = [
      ['cat-focused', '#087A59', '#91A7FF'],
      ['cat-rest', '#3B82F6', '#FFAD68'],
      ['cat-study', '#10B981', '#C4A7FF'],
      ['cat-health', '#EF4444', '#FF7A86'],
      ['cat-life', '#F59E0B', '#F0B45D'],
      ['cat-sleep', '#6366F1', '#7C8CF8'],
    ];
    for (const [id, legacyColor, aeviaColor] of legacyCategoryColors) {
      await tx.executeSql(
        `UPDATE categories SET color = ? WHERE id = ? AND is_default = 1 AND color = ?;`,
        [aeviaColor, id, legacyColor]
      );
    }

    // Repair the exact archive pattern produced by the short-lived alpha
    // onboarding bug: its default first four stayed visible while the latter
    // four defaults were archived. The narrow all-four guard avoids reviving
    // ordinary individual archive choices.
    const onboardingArchivePattern = await tx.executeSql(
      `SELECT COUNT(*) AS count FROM activities
       WHERE id IN ('act-exercise', 'act-cleaning', 'act-rest', 'act-sleep')
         AND created_at = 1700000000000
         AND is_archived = 1;`
    );
    if (Number(onboardingArchivePattern.rows[0]?.count ?? 0) === 4) {
      await tx.executeSql(
        `UPDATE activities SET is_archived = 0, updated_at = ?
         WHERE id IN ('act-exercise', 'act-cleaning', 'act-rest', 'act-sleep')
           AND created_at = 1700000000000;`,
        [Date.now()]
      );
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
