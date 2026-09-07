import { IClock, SystemClock } from './clock';
import { IDatabaseAdapter } from '../data/dbAdapter';
import { Repository } from '../data/repository';
import { Interval, Session, WakeMarker } from './types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class TimeEngine {
  private inFlightLock: boolean = false;

  constructor(
    private db: IDatabaseAdapter,
    private repo: Repository,
    private clock: IClock = new SystemClock()
  ) {}

  /**
   * Acquire a lock to prevent concurrent command races / double taps.
   */
  private async withLock<T>(action: () => Promise<T>): Promise<T> {
    if (this.inFlightLock) {
      throw new Error('COMMAND_IN_PROGRESS: Another command is currently executing.');
    }
    this.inFlightLock = true;
    try {
      return await action();
    } finally {
      this.inFlightLock = false;
    }
  }

  /**
   * Start a new session.
   * If a session is already running with the same activity, idempotent return.
   * If a session is already running with a different activity or paused, throws or requires switch.
   */
  async start(activityId: string, customTimeMs?: number, targetSeconds?: number): Promise<Session> {
    return await this.withLock(async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (current) {
          if (current.session.status === 'running' && current.session.activityId === activityId) {
            // Idempotent start: return existing running session
            return current.session;
          }
          throw new Error('ACTIVE_SESSION_EXISTS: Finish or switch existing session first.');
        }

        const sessionId = generateUUID();
        const intervalId = generateUUID();

        const session: Session = {
          id: sessionId,
          activityId,
          status: 'running',
          startedAt: now,
          endedAt: null,
          targetSeconds: targetSeconds ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const interval: Interval = {
          id: intervalId,
          sessionId,
          activityId,
          kind: 'active',
          startMs: now,
          endMs: null,
          reason: null,
          revision: 1,
        };

        await this.repo.saveSession(session);
        await this.repo.saveInterval(interval);

        return session;
      });
    });
  }

  /**
   * Pause the currently running session.
   * If already paused, idempotent return.
   */
  async pause(reason?: string, customTimeMs?: number): Promise<Session> {
    return await this.withLock(async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (!current) {
          throw new Error('NO_ACTIVE_SESSION: Cannot pause when idle.');
        }

        if (current.session.status === 'paused') {
          // Idempotent pause: if reason provided, update reason of open pause interval
          if (reason && current.openInterval && current.openInterval.kind === 'pause') {
            current.openInterval.reason = reason;
            await this.repo.saveInterval(current.openInterval);
          }
          return current.session;
        }

        if (current.session.status !== 'running') {
          throw new Error(`INVALID_STATE: Cannot pause from status ${current.session.status}`);
        }

        // Close current active interval
        if (current.openInterval) {
          const openStart = current.openInterval.startMs;
          const safeEnd = Math.max(openStart + 1, now);
          current.openInterval.endMs = safeEnd;
          await this.repo.saveInterval(current.openInterval);
        }

        // Update session to paused
        const updatedSession: Session = {
          ...current.session,
          status: 'paused',
          updatedAt: now,
        };
        await this.repo.saveSession(updatedSession);

        // Open pause interval
        const pauseInterval: Interval = {
          id: generateUUID(),
          sessionId: current.session.id,
          activityId: current.session.activityId,
          kind: 'pause',
          startMs: now,
          endMs: null,
          reason: reason ?? null,
          revision: 1,
        };
        await this.repo.saveInterval(pauseInterval);

        return updatedSession;
      });
    });
  }

  /**
   * Resume the paused session.
   * If already running, idempotent return.
   */
  async resume(customTimeMs?: number): Promise<Session> {
    return await this.withLock(async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (!current) {
          throw new Error('NO_ACTIVE_SESSION: Cannot resume when idle.');
        }

        if (current.session.status === 'running') {
          // Idempotent resume
          return current.session;
        }

        if (current.session.status !== 'paused') {
          throw new Error(`INVALID_STATE: Cannot resume from status ${current.session.status}`);
        }

        // Close current pause interval
        if (current.openInterval) {
          const openStart = current.openInterval.startMs;
          const safeEnd = Math.max(openStart + 1, now);
          current.openInterval.endMs = safeEnd;
          await this.repo.saveInterval(current.openInterval);
        }

        // Update session to running
        const updatedSession: Session = {
          ...current.session,
          status: 'running',
          updatedAt: now,
        };
        await this.repo.saveSession(updatedSession);

        // Open active interval
        const activeInterval: Interval = {
          id: generateUUID(),
          sessionId: current.session.id,
          activityId: current.session.activityId,
          kind: 'active',
          startMs: now,
          endMs: null,
          reason: null,
          revision: 1,
        };
        await this.repo.saveInterval(activeInterval);

        return updatedSession;
      });
    });
  }

  /**
   * Finish the currently running or paused session.
   */
  async finish(customTimeMs?: number): Promise<Session> {
    return await this.withLock(async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (!current) {
          throw new Error('NO_ACTIVE_SESSION: No session to finish.');
        }

        // Close whatever interval is open
        if (current.openInterval) {
          const openStart = current.openInterval.startMs;
          const safeEnd = Math.max(openStart + 1, now);
          current.openInterval.endMs = safeEnd;
          await this.repo.saveInterval(current.openInterval);
        }

        // Update session to completed
        const completedSession: Session = {
          ...current.session,
          status: 'completed',
          endedAt: now,
          updatedAt: now,
        };
        await this.repo.saveSession(completedSession);

        return completedSession;
      });
    });
  }

  /**
   * Atomically finish existing session and start new session for new activity.
   */
  async switchActivity(newActivityId: string, customTimeMs?: number): Promise<Session> {
    return await this.withLock(async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (current) {
          // Close open interval
          if (current.openInterval) {
            const openStart = current.openInterval.startMs;
            current.openInterval.endMs = Math.max(openStart + 1, now);
            await this.repo.saveInterval(current.openInterval);
          }
          // Complete current session
          await this.repo.saveSession({
            ...current.session,
            status: 'completed',
            endedAt: now,
            updatedAt: now,
          });
        }

        // Start new session
        const sessionId = generateUUID();
        const newSession: Session = {
          id: sessionId,
          activityId: newActivityId,
          status: 'running',
          startedAt: now,
          endedAt: null,
          targetSeconds: null,
          createdAt: now,
          updatedAt: now,
        };

        const activeInterval: Interval = {
          id: generateUUID(),
          sessionId,
          activityId: newActivityId,
          kind: 'active',
          startMs: now,
          endMs: null,
          reason: null,
          revision: 1,
        };

        await this.repo.saveSession(newSession);
        await this.repo.saveInterval(activeInterval);

        return newSession;
      });
    });
  }

  /**
   * Label or re-label an existing pause interval without adding duplicate intervals.
   */
  async labelPause(intervalId: string, reason: string): Promise<void> {
    const inv = await this.repo.getIntervalById(intervalId);
    if (!inv) {
      throw new Error('INTERVAL_NOT_FOUND');
    }
    if (inv.kind !== 'pause') {
      throw new Error('INVALID_KIND: Only pause intervals can be labeled with pause reasons.');
    }
    inv.reason = reason;
    inv.revision += 1;
    await this.repo.saveInterval(inv);
  }

  /**
   * Label an untracked gap by inserting manual intervals.
   * Checks that inserted intervals fit strictly inside [gapStartMs, gapEndMs] and don't collide.
   */
  async splitGap(
    gapStartMs: number,
    gapEndMs: number,
    segments: Array<{ activityId: string; durationMs: number; reason?: string }>
  ): Promise<void> {
    if (gapEndMs <= gapStartMs) {
      throw new Error('INVALID_GAP: gapEndMs must be strictly greater than gapStartMs.');
    }

    const totalRequestedMs = segments.reduce((sum, s) => sum + s.durationMs, 0);
    if (totalRequestedMs > gapEndMs - gapStartMs) {
      throw new Error('OVERSIZED_SEGMENTS: Total segment durations exceed gap length.');
    }

    await this.db.transaction(async (tx) => {
      // Collision verification: ensure no existing intervals overlap [gapStartMs, gapEndMs)
      const existing = await this.repo.getIntervals(gapStartMs, gapEndMs);
      const hasCollision = existing.some((inv) => {
        const invEnd = inv.endMs ?? this.clock.now();
        return inv.startMs < gapEndMs && invEnd > gapStartMs;
      });

      if (hasCollision) {
        throw new Error('GAP_COLLISION: One or more intervals already exist in this window.');
      }

      let cursor = gapStartMs;
      for (const seg of segments) {
        if (seg.durationMs <= 0) continue;
        const segEnd = cursor + seg.durationMs;
        const interval: Interval = {
          id: generateUUID(),
          sessionId: null,
          activityId: seg.activityId,
          kind: 'manual',
          startMs: cursor,
          endMs: segEnd,
          reason: seg.reason ?? null,
          revision: 1,
        };
        await this.repo.saveInterval(interval);
        cursor = segEnd;
      }
    });
  }

  /**
   * Edit an existing closed interval with collision validation.
   */
  async editInterval(
    intervalId: string,
    newStartMs: number,
    newEndMs: number,
    newActivityId?: string,
    newReason?: string
  ): Promise<void> {
    if (newEndMs <= newStartMs) {
      throw new Error('INVALID_RANGE: newEndMs must be greater than newStartMs.');
    }

    await this.db.transaction(async (tx) => {
      const inv = await this.repo.getIntervalById(intervalId);
      if (!inv) {
        throw new Error('INTERVAL_NOT_FOUND');
      }

      // Check collisions with other intervals (excluding self)
      const windowIntervals = await this.repo.getIntervals(newStartMs, newEndMs);
      const collision = windowIntervals.some((other) => {
        if (other.id === intervalId) return false;
        const otherEnd = other.endMs ?? this.clock.now();
        // Half-open check: [newStartMs, newEndMs) overlaps with [other.startMs, otherEnd)
        return newStartMs < otherEnd && newEndMs > other.startMs;
      });

      if (collision) {
        throw new Error('COLLISION_ERROR: Interval overlaps with another existing record.');
      }

      inv.startMs = newStartMs;
      inv.endMs = newEndMs;
      if (newActivityId !== undefined) inv.activityId = newActivityId;
      if (newReason !== undefined) inv.reason = newReason;
      inv.revision += 1;

      await this.repo.saveInterval(inv);
    });
  }

  /**
   * Delete an interval.
   */
  async deleteInterval(intervalId: string): Promise<void> {
    await this.repo.deleteInterval(intervalId);
  }

  /**
   * Record explicit manual wake marker.
   */
  async recordWakeMarker(timestampMs?: number, note?: string): Promise<WakeMarker> {
    const time = timestampMs ?? this.clock.now();
    const marker: WakeMarker = {
      id: generateUUID(),
      timestampMs: time,
      source: 'manual',
      note: note ?? null,
    };
    await this.repo.saveWakeMarker(marker);
    await this.repo.updateSettings({ lastWakeMarkerMs: time });
    return marker;
  }

  /**
   * Get active state and derived live durations.
   */
  async getCurrentState(): Promise<{
    session: Session | null;
    openInterval: Interval | null;
    elapsedActiveMs: number;
    elapsedPauseMs: number;
    totalElapsedMs: number;
  }> {
    const now = this.clock.now();
    const current = await this.repo.getCurrentSession();
    if (!current) {
      return {
        session: null,
        openInterval: null,
        elapsedActiveMs: 0,
        elapsedPauseMs: 0,
        totalElapsedMs: 0,
      };
    }

    const { session, openInterval } = current;
    const intervals = await this.repo.getIntervals(session.startedAt, now);
    const sessionIntervals = intervals.filter((i) => i.sessionId === session.id);

    let elapsedActiveMs = 0;
    let elapsedPauseMs = 0;

    for (const inv of sessionIntervals) {
      const start = inv.startMs;
      const end = inv.endMs ?? now;
      const duration = Math.max(0, end - start);

      if (inv.kind === 'active') {
        elapsedActiveMs += duration;
      } else if (inv.kind === 'pause') {
        elapsedPauseMs += duration;
      }
    }

    const totalElapsedMs = Math.max(0, now - session.startedAt);

    return {
      session,
      openInterval,
      elapsedActiveMs,
      elapsedPauseMs,
      totalElapsedMs,
    };
  }
}
