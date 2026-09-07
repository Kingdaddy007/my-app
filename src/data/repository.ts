import { IDatabaseAdapter } from './dbAdapter';
import {
  Activity,
  ActivityCategory,
  BackupData,
  Interval,
  Priority,
  Session,
  UserSettings,
  WakeMarker,
} from '../domain/types';
import { DEFAULT_SETTINGS, INITIAL_ACTIVITIES, INITIAL_CATEGORIES } from './schema';

export class Repository {
  constructor(private db: IDatabaseAdapter) {}

  // ---------------- Categories ----------------
  async getCategories(): Promise<ActivityCategory[]> {
    const res = await this.db.executeSql(`SELECT * FROM categories ORDER BY created_at ASC;`);
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      icon: r.icon,
      isDefault: Boolean(r.is_default),
      createdAt: Number(r.created_at),
    }));
  }

  async saveCategory(cat: ActivityCategory): Promise<void> {
    await this.db.executeSql(
      `INSERT INTO categories (id, name, color, icon, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         color = excluded.color,
         icon = excluded.icon;`,
      [cat.id, cat.name, cat.color, cat.icon, cat.isDefault ? 1 : 0, cat.createdAt]
    );
  }

  // ---------------- Activities ----------------
  async getActivities(includeArchived: boolean = false): Promise<Activity[]> {
    const query = includeArchived
      ? `SELECT * FROM activities ORDER BY is_favorite DESC, name ASC;`
      : `SELECT * FROM activities WHERE is_archived = 0 ORDER BY is_favorite DESC, name ASC;`;
    const res = await this.db.executeSql(query);
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      iconKey: r.icon_key,
      categoryId: r.category_id,
      isFavorite: Boolean(r.is_favorite),
      isArchived: Boolean(r.is_archived),
      targetSeconds: r.target_seconds != null ? Number(r.target_seconds) : null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const res = await this.db.executeSql(`SELECT * FROM activities WHERE id = ?;`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      iconKey: r.icon_key,
      categoryId: r.category_id,
      isFavorite: Boolean(r.is_favorite),
      isArchived: Boolean(r.is_archived),
      targetSeconds: r.target_seconds != null ? Number(r.target_seconds) : null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    };
  }

  async saveActivity(act: Activity): Promise<void> {
    await this.db.executeSql(
      `INSERT INTO activities (id, name, icon_key, category_id, is_favorite, is_archived, target_seconds, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         icon_key = excluded.icon_key,
         category_id = excluded.category_id,
         is_favorite = excluded.is_favorite,
         is_archived = excluded.is_archived,
         target_seconds = excluded.target_seconds,
         updated_at = excluded.updated_at;`,
      [
        act.id,
        act.name,
        act.iconKey,
        act.categoryId,
        act.isFavorite ? 1 : 0,
        act.isArchived ? 1 : 0,
        act.targetSeconds ?? null,
        act.createdAt,
        act.updatedAt,
      ]
    );
  }

  async archiveActivity(id: string): Promise<void> {
    await this.db.executeSql(`UPDATE activities SET is_archived = 1, updated_at = ? WHERE id = ?;`, [Date.now(), id]);
  }

  // ---------------- Sessions & Intervals ----------------
  async getCurrentSession(): Promise<{ session: Session; openInterval: Interval | null } | null> {
    const res = await this.db.executeSql(
      `SELECT * FROM sessions WHERE status IN ('running', 'paused') ORDER BY started_at DESC LIMIT 1;`
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    const session: Session = {
      id: r.id,
      activityId: r.activity_id,
      status: r.status,
      startedAt: Number(r.started_at),
      endedAt: r.ended_at != null ? Number(r.ended_at) : null,
      targetSeconds: r.target_seconds != null ? Number(r.target_seconds) : null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    };

    const invRes = await this.db.executeSql(
      `SELECT * FROM intervals WHERE session_id = ? AND end_ms IS NULL LIMIT 1;`,
      [session.id]
    );
    let openInterval: Interval | null = null;
    if (invRes.rows.length > 0) {
      const ir = invRes.rows[0];
      openInterval = {
        id: ir.id,
        sessionId: ir.session_id,
        activityId: ir.activity_id,
        kind: ir.kind,
        startMs: Number(ir.start_ms),
        endMs: null,
        reason: ir.reason,
        revision: Number(ir.revision),
      };
    }

    return { session, openInterval };
  }

  async saveSession(session: Session): Promise<void> {
    await this.db.executeSql(
      `INSERT INTO sessions (id, activity_id, status, started_at, ended_at, target_seconds, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         ended_at = excluded.ended_at,
         target_seconds = excluded.target_seconds,
         updated_at = excluded.updated_at;`,
      [
        session.id,
        session.activityId,
        session.status,
        session.startedAt,
        session.endedAt ?? null,
        session.targetSeconds ?? null,
        session.createdAt,
        session.updatedAt,
      ]
    );
  }

  async getSessions(fromMs?: number, toMs?: number): Promise<Session[]> {
    let sql = `SELECT * FROM sessions`;
    const params: any[] = [];
    if (fromMs != null && toMs != null) {
      sql += ` WHERE (started_at >= ? AND started_at < ?) OR (ended_at IS NULL) OR (ended_at >= ? AND ended_at < ?)`;
      params.push(fromMs, toMs, fromMs, toMs);
    }
    sql += ` ORDER BY started_at ASC;`;
    const res = await this.db.executeSql(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      activityId: r.activity_id,
      status: r.status,
      startedAt: Number(r.started_at),
      endedAt: r.ended_at != null ? Number(r.ended_at) : null,
      targetSeconds: r.target_seconds != null ? Number(r.target_seconds) : null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));
  }

  async getIntervals(fromMs?: number, toMs?: number): Promise<Interval[]> {
    let sql = `SELECT * FROM intervals`;
    const params: any[] = [];
    if (fromMs != null && toMs != null) {
      sql += ` WHERE (start_ms < ? AND (end_ms IS NULL OR end_ms > ?))`;
      params.push(toMs, fromMs);
    }
    sql += ` ORDER BY start_ms ASC;`;
    const res = await this.db.executeSql(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      activityId: r.activity_id,
      kind: r.kind,
      startMs: Number(r.start_ms),
      endMs: r.end_ms != null ? Number(r.end_ms) : null,
      reason: r.reason,
      revision: Number(r.revision),
    }));
  }

  async getIntervalById(id: string): Promise<Interval | null> {
    const res = await this.db.executeSql(`SELECT * FROM intervals WHERE id = ?;`, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      sessionId: r.session_id,
      activityId: r.activity_id,
      kind: r.kind,
      startMs: Number(r.start_ms),
      endMs: r.end_ms != null ? Number(r.end_ms) : null,
      reason: r.reason,
      revision: Number(r.revision),
    };
  }

  async saveInterval(inv: Interval): Promise<void> {
    await this.db.executeSql(
      `INSERT INTO intervals (id, session_id, activity_id, kind, start_ms, end_ms, reason, revision)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         session_id = excluded.session_id,
         activity_id = excluded.activity_id,
         kind = excluded.kind,
         start_ms = excluded.start_ms,
         end_ms = excluded.end_ms,
         reason = excluded.reason,
         revision = excluded.revision;`,
      [
        inv.id,
        inv.sessionId ?? null,
        inv.activityId ?? null,
        inv.kind,
        inv.startMs,
        inv.endMs ?? null,
        inv.reason ?? null,
        inv.revision,
      ]
    );
  }

  async deleteInterval(id: string): Promise<void> {
    await this.db.executeSql(`DELETE FROM intervals WHERE id = ?;`, [id]);
  }

  // ---------------- Priorities ----------------
  async getPrioritiesForDate(date: string): Promise<Priority[]> {
    const res = await this.db.executeSql(
      `SELECT * FROM priorities WHERE target_date = ? ORDER BY order_index ASC;`,
      [date]
    );
    return res.rows.map((r) => ({
      id: r.id,
      targetDate: r.target_date,
      title: r.title,
      order: Number(r.order_index),
      activityId: r.activity_id,
      completedAt: r.completed_at != null ? Number(r.completed_at) : null,
      createdAt: Number(r.created_at),
    }));
  }

  async savePriority(p: Priority): Promise<void> {
    await this.db.executeSql(
      `INSERT INTO priorities (id, target_date, title, order_index, activity_id, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         order_index = excluded.order_index,
         activity_id = excluded.activity_id,
         completed_at = excluded.completed_at;`,
      [p.id, p.targetDate, p.title, p.order, p.activityId ?? null, p.completedAt ?? null, p.createdAt]
    );
  }

  async deletePriority(id: string): Promise<void> {
    await this.db.executeSql(`DELETE FROM priorities WHERE id = ?;`, [id]);
  }

  // ---------------- Wake Markers ----------------
  async getWakeMarkerForDate(date: string): Promise<WakeMarker | null> {
    const [year, month, day] = date.split('-').map(Number);
    const startMs = new Date(year, month - 1, day, 0, 0, 0).getTime();
    const endMs = new Date(year, month - 1, day + 1, 0, 0, 0).getTime();

    const res = await this.db.executeSql(
      `SELECT * FROM wake_markers WHERE timestamp_ms >= ? AND timestamp_ms < ? ORDER BY timestamp_ms DESC LIMIT 1;`,
      [startMs, endMs]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      timestampMs: Number(r.timestamp_ms),
      source: 'manual',
      note: r.note,
    };
  }

  async saveWakeMarker(marker: WakeMarker): Promise<void> {
    await this.db.executeSql(
      `INSERT INTO wake_markers (id, timestamp_ms, source, note)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         timestamp_ms = excluded.timestamp_ms,
         note = excluded.note;`,
      [marker.id, marker.timestampMs, marker.source, marker.note ?? null]
    );
  }

  // ---------------- Settings ----------------
  async getSettings(): Promise<UserSettings> {
    const res = await this.db.executeSql(`SELECT key, value FROM settings;`);
    const settings = { ...DEFAULT_SETTINGS };
    for (const r of res.rows) {
      try {
        (settings as any)[r.key] = JSON.parse(r.value);
      } catch {
        // ignore parse error
      }
    }
    return settings;
  }

  async updateSettings(partial: Partial<UserSettings>): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const [k, v] of Object.entries(partial)) {
        await tx.executeSql(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
          [k, JSON.stringify(v)]
        );
      }
    });
  }

  // ---------------- Backup / Export / Restore ----------------
  async exportAllData(): Promise<BackupData> {
    const categories = await this.getCategories();
    const activities = await this.getActivities(true);
    const sessions = await this.getSessions();
    const intervals = await this.getIntervals();
    const settings = await this.getSettings();

    const wakeRes = await this.db.executeSql(`SELECT * FROM wake_markers;`);
    const wakeMarkers: WakeMarker[] = wakeRes.rows.map((r) => ({
      id: r.id,
      timestampMs: Number(r.timestamp_ms),
      source: 'manual',
      note: r.note,
    }));

    const priorityRes = await this.db.executeSql(`SELECT * FROM priorities;`);
    const priorities: Priority[] = priorityRes.rows.map((r) => ({
      id: r.id,
      targetDate: r.target_date,
      title: r.title,
      order: Number(r.order_index),
      activityId: r.activity_id,
      completedAt: r.completed_at != null ? Number(r.completed_at) : null,
      createdAt: Number(r.created_at),
    }));

    return {
      version: 1,
      appVersion: '1.0.0',
      exportedAt: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
      data: {
        categories,
        activities,
        sessions,
        intervals,
        wakeMarkers,
        priorities,
        settings,
      },
    };
  }

  async restoreAllData(backup: BackupData): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Clear existing records
      await tx.executeSql(`DELETE FROM intervals;`);
      await tx.executeSql(`DELETE FROM sessions;`);
      await tx.executeSql(`DELETE FROM priorities;`);
      await tx.executeSql(`DELETE FROM wake_markers;`);
      await tx.executeSql(`DELETE FROM activities;`);
      await tx.executeSql(`DELETE FROM categories;`);
      await tx.executeSql(`DELETE FROM settings;`);

      // Restore categories
      for (const cat of backup.data.categories) {
        await tx.executeSql(
          `INSERT INTO categories (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
          [cat.id, cat.name, cat.color, cat.icon, cat.isDefault ? 1 : 0, cat.createdAt]
        );
      }

      // Restore activities
      for (const act of backup.data.activities) {
        await tx.executeSql(
          `INSERT INTO activities (id, name, icon_key, category_id, is_favorite, is_archived, target_seconds, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [act.id, act.name, act.iconKey, act.categoryId, act.isFavorite ? 1 : 0, act.isArchived ? 1 : 0, act.targetSeconds ?? null, act.createdAt, act.updatedAt]
        );
      }

      // Restore sessions
      for (const s of backup.data.sessions) {
        await tx.executeSql(
          `INSERT INTO sessions (id, activity_id, status, started_at, ended_at, target_seconds, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [s.id, s.activityId, s.status, s.startedAt, s.endedAt ?? null, s.targetSeconds ?? null, s.createdAt, s.updatedAt]
        );
      }

      // Restore intervals
      for (const i of backup.data.intervals) {
        await tx.executeSql(
          `INSERT INTO intervals (id, session_id, activity_id, kind, start_ms, end_ms, reason, revision)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [i.id, i.sessionId ?? null, i.activityId ?? null, i.kind, i.startMs, i.endMs ?? null, i.reason ?? null, i.revision]
        );
      }

      // Restore wake markers
      for (const w of backup.data.wakeMarkers) {
        await tx.executeSql(
          `INSERT INTO wake_markers (id, timestamp_ms, source, note) VALUES (?, ?, ?, ?);`,
          [w.id, w.timestampMs, w.source, w.note ?? null]
        );
      }

      // Restore priorities
      for (const p of backup.data.priorities) {
        await tx.executeSql(
          `INSERT INTO priorities (id, target_date, title, order_index, activity_id, completed_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [p.id, p.targetDate, p.title, p.order, p.activityId ?? null, p.completedAt ?? null, p.createdAt]
        );
      }

      // Restore settings
      for (const [k, v] of Object.entries(backup.data.settings)) {
        await tx.executeSql(`INSERT INTO settings (key, value) VALUES (?, ?);`, [k, JSON.stringify(v)]);
      }
    });
  }

  async clearAllData(): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.executeSql(`DELETE FROM intervals;`);
      await tx.executeSql(`DELETE FROM sessions;`);
      await tx.executeSql(`DELETE FROM priorities;`);
      await tx.executeSql(`DELETE FROM wake_markers;`);
      await tx.executeSql(`DELETE FROM activities;`);
      await tx.executeSql(`DELETE FROM categories;`);
      await tx.executeSql(`DELETE FROM settings;`);

      // Re-seed defaults
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
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
        await tx.executeSql(`INSERT INTO settings (key, value) VALUES (?, ?);`, [k, JSON.stringify(v)]);
      }
    });
  }
}
