import { IClock, SystemClock } from './clock';
import { IDatabaseAdapter } from '../data/dbAdapter';
import { Repository } from '../data/repository';
import { Interval, Session, SessionStartOptions, WakeMarker } from './types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class TimeEngine {
  private commandTail: Promise<void> = Promise.resolve();
  private pendingCommands = new Map<string, Promise<unknown>>();

  constructor(
    private db: IDatabaseAdapter,
    private repo: Repository,
    private clock: IClock = new SystemClock()
  ) {}

  /**
   * Acquire a lock to prevent concurrent command races / double taps.
   * Same-key concurrent calls coalesce to the first promise.
   * Different-key calls serialize behind the in-flight command instead of
   * throwing COMMAND_IN_PROGRESS, so rapid Track->Focus taps stay safe.
   */
  private async withLock<T>(key: string, action: () => Promise<T>): Promise<T> {
    const existing = this.pendingCommands.get(key);
    if (existing) return existing as Promise<T>;

    // Every different command joins one promise chain. Unlike waiting on a
    // single mutable "current" promise, this remains safe when three or more
    // different commands arrive before the first one settles.
    const promise = this.commandTail.then(action, action);
    this.commandTail = promise.then(
      () => undefined,
      () => undefined
    );
    this.pendingCommands.set(key, promise);
    const cleanup = () => {
      if (this.pendingCommands.get(key) === promise) this.pendingCommands.delete(key);
    };
    void promise.then(cleanup, cleanup);
    return promise;
  }

  /**
   * Monotonic guard: wall-clock instants must never move backwards inside a
   * live session. Without this, pause(t0-10m) creates overlapping rows that
   * permanently invalidate backup export (OVERLAP).
   */
  private requireMonotonic(now: number, openStartMs: number | null): void {
    if (openStartMs != null && now < openStartMs) {
      throw new Error(
        'INVALID_TIME: Device clock moved backwards. No change was saved; correct the time and retry.'
      );
    }
  }

  /** Shared overtime/target helper so UI and engine never diverge on clocks. */
  static focusTargetState(
    session: Session | null,
    elapsedActiveMs: number
  ): { targetMs: number | null; reached: boolean; overtimeMs: number; remainingMs: number } {
    const targetMs =
      session?.experience === 'focus' && session.targetSeconds != null
        ? session.targetSeconds * 1000
        : null;
    if (targetMs == null) return { targetMs, reached: false, overtimeMs: 0, remainingMs: 0 };
    const reached = elapsedActiveMs >= targetMs;
    return {
      targetMs,
      reached,
      overtimeMs: reached ? elapsedActiveMs - targetMs : 0,
      remainingMs: reached ? 0 : targetMs - elapsedActiveMs,
    };
  }

  /**
   * Start a new session.
   * If a session is already running with the same activity, idempotent return.
   * If a session is already running with a different activity or paused, throws or requires switch.
   */
  async start(
    activityId: string,
    customTimeMs?: number,
    input?: number | SessionStartOptions
  ): Promise<Session> {
    const options: SessionStartOptions =
      typeof input === 'number'
        ? { experience: 'focus', targetSeconds: input }
        : input ?? { experience: 'track' };
    const targetSeconds = options.experience === 'focus' ? options.targetSeconds ?? null : null;
    const intention = options.intention?.trim() || null;
    if (targetSeconds != null && (!Number.isFinite(targetSeconds) || targetSeconds <= 0)) {
      throw new Error('INVALID_TARGET: Focus target must be a positive duration.');
    }
    if (intention && intention.length > 160) {
      throw new Error('INVALID_INTENTION: Intention must be 160 characters or fewer.');
    }

    const commandKey = `start:${activityId}:${options.experience}:${targetSeconds ?? 'open'}:${intention ?? ''}:${customTimeMs ?? 'now'}`;
    return await this.withLock(commandKey, async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (current) {
          // Idempotent start: same activity while running OR paused returns existing.
          if (current.session.activityId === activityId) {
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
          experience: options.experience,
          startedAt: now,
          endedAt: null,
          targetSeconds: targetSeconds ?? null,
          intention,
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
    return await this.withLock(`pause:${reason ?? ''}:${customTimeMs ?? 'now'}`, async () => {
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
            current.openInterval.revision += 1;
            await this.repo.saveInterval(current.openInterval);
          }
          return current.session;
        }

        if (current.session.status !== 'running') {
          throw new Error(`INVALID_STATE: Cannot pause from status ${current.session.status}`);
        }

        this.requireMonotonic(now, current.openInterval?.startMs ?? current.session.startedAt);
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
    return await this.withLock(`resume:${customTimeMs ?? 'now'}`, async () => {
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

        this.requireMonotonic(now, current.openInterval?.startMs ?? current.session.startedAt);
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
   * Idempotent: a repeated finish with no active session returns the most
   * recent completed session instead of throwing, so double-tap Finish never
   * surfaces NO_ACTIVE_SESSION to the user.
   */
  private lastCompletedSession: Session | null = null;

  async finish(customTimeMs?: number): Promise<Session> {
    return await this.withLock(`finish:${customTimeMs ?? 'now'}`, async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (!current) {
          if (this.lastCompletedSession) return this.lastCompletedSession;
          const recent = await this.repo.getSessions();
          const lastCompleted = [...recent].reverse().find((s) => s.status === 'completed');
          if (lastCompleted) {
            this.lastCompletedSession = lastCompleted;
            return lastCompleted;
          }
          throw new Error('NO_ACTIVE_SESSION: No session to finish.');
        }

        this.requireMonotonic(now, current.openInterval?.startMs ?? current.session.startedAt);
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
        this.lastCompletedSession = completedSession;

        return completedSession;
      });
    });
  }

  /**
   * Atomically finish existing session and start new session for new activity.
   */
  async switchActivity(
    newActivityId: string,
    customTimeMs?: number,
    options: SessionStartOptions = { experience: 'track' }
  ): Promise<Session> {
    const targetSeconds = options.experience === 'focus' ? options.targetSeconds ?? null : null;
    const intention = options.intention?.trim() || null;
    if (targetSeconds != null && (!Number.isFinite(targetSeconds) || targetSeconds <= 0)) {
      throw new Error('INVALID_TARGET: Focus target must be a positive duration.');
    }
    if (intention && intention.length > 160) {
      throw new Error('INVALID_INTENTION: Intention must be 160 characters or fewer.');
    }
    return await this.withLock(
      `switch:${newActivityId}:${options.experience}:${targetSeconds ?? 'open'}:${intention ?? ''}:${customTimeMs ?? 'now'}`,
      async () => {
      const now = customTimeMs ?? this.clock.now();

      return await this.db.transaction(async (tx) => {
        const current = await this.repo.getCurrentSession();
        if (current) {
          if (current.session.activityId === newActivityId) {
            // Switching to the same activity preserves the current session.
            return current.session;
          }
          this.requireMonotonic(now, current.openInterval?.startMs ?? current.session.startedAt);
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
          experience: options.experience,
          startedAt: now,
          endedAt: null,
          targetSeconds,
          intention,
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
      }
    );
  }

  /**
   * Label or re-label an existing pause interval without adding duplicate intervals.
   */
  async labelPause(intervalId: string, reason: string): Promise<void> {
    return await this.withLock(`labelPause:${intervalId}:${reason}`, async () =>
      this.db.transaction(async () => {
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
      })
    );
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

    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error('EMPTY_SEGMENTS: At least one segment is required to split a gap.');
    }

    for (const seg of segments) {
      if (!Number.isFinite(seg.durationMs) || seg.durationMs <= 0) {
        throw new Error('INVALID_DURATION: Segment duration must be a positive finite number.');
      }
      if (!seg.activityId) {
        throw new Error('INVALID_ACTIVITY: Segment requires an activityId.');
      }
    }

    const totalRequestedMs = segments.reduce((sum, s) => sum + s.durationMs, 0);
    if (totalRequestedMs > gapEndMs - gapStartMs) {
      throw new Error('OVERSIZED_SEGMENTS: Total segment durations exceed gap length.');
    }

    await this.withLock(`split:${gapStartMs}:${gapEndMs}`, async () => this.db.transaction(async () => {
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
    }));
  }

  /**
   * Edit an existing closed interval with collision validation.
   * Closed segments belonging to the live session are also protected: the
   * open session's history changes only through session commands.
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

    await this.withLock(`edit:${intervalId}`, async () => this.db.transaction(async () => {
      const inv = await this.repo.getIntervalById(intervalId);
      if (!inv) {
        throw new Error('INTERVAL_NOT_FOUND');
      }
      if (inv.endMs == null) {
        throw new Error('OPEN_INTERVAL_PROTECTED: Manage the live interval through session controls.');
      }
      const current = await this.repo.getCurrentSession();
      if (current && inv.sessionId != null && inv.sessionId === current.session.id) {
        throw new Error('LIVE_SESSION_PROTECTED: Finish the session before editing its history.');
      }

      // Check collisions with other intervals (excluding self), INCLUDING the
      // live open interval evaluated at the current clock value. Editing an
      // older record across the running timer would otherwise create
      // contradictory history.
      const nowForCollision = this.clock.now();
      const windowIntervals = await this.repo.getIntervals(newStartMs, newEndMs);
      const collision = windowIntervals.some((other) => {
        if (other.id === intervalId) return false;
        const otherEnd = other.endMs ?? nowForCollision;
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
    }));
  }

  /**
   * Delete an interval. Live-session records are protected.
   */
  async deleteInterval(intervalId: string): Promise<void> {
    return await this.withLock(`delete:${intervalId}`, async () =>
      this.db.transaction(async () => {
        const inv = await this.repo.getIntervalById(intervalId);
        if (!inv) throw new Error('INTERVAL_NOT_FOUND');
        if (inv.endMs == null) {
          throw new Error('OPEN_INTERVAL_PROTECTED: Manage the live interval through session controls.');
        }
        const current = await this.repo.getCurrentSession();
        if (current && inv.sessionId != null && inv.sessionId === current.session.id) {
          throw new Error('LIVE_SESSION_PROTECTED: Finish the session before editing its history.');
        }
        await this.repo.deleteInterval(intervalId);
      })
    );
  }

  async extendFocusTarget(extraSeconds: number): Promise<Session> {
    if (!Number.isFinite(extraSeconds) || extraSeconds <= 0) {
      throw new Error('INVALID_EXTENSION: Extension must be a positive duration.');
    }
    return await this.withLock(`extend:${extraSeconds}`, async () =>
      this.db.transaction(async () => {
        const current = await this.repo.getCurrentSession();
        if (!current || current.session.experience !== 'focus') {
          throw new Error('NO_FOCUS_SESSION: A live Focus session is required.');
        }
        const updated: Session = {
          ...current.session,
          targetSeconds: (current.session.targetSeconds ?? 0) + extraSeconds,
          updatedAt: this.clock.now(),
        };
        await this.repo.saveSession(updated);
        return updated;
      })
    );
  }

  /**
   * Start a real persistent Sleep session. Unlike starting the Sleep activity
   * as track/active, this writes kind='sleep' so Review balance attributes
   * sleep correctly and the shell can switch to the sleeping presentation.
   * The single-open-session invariant still applies: an active session must
   * be finished or switched explicitly first.
   */
  async startSleep(sleepActivityId: string, customTimeMs?: number): Promise<Session> {
    const commandKey = `sleep:start:${sleepActivityId}:${customTimeMs ?? 'now'}`;
    return await this.withLock(commandKey, async () => {
      const now = customTimeMs ?? this.clock.now();
      return await this.db.transaction(async () => {
        const current = await this.repo.getCurrentSession();
        if (current) {
          throw new Error('ACTIVE_SESSION_EXISTS: Finish the current session before sleep.');
        }
        const sessionId = generateUUID();
        const session: Session = {
          id: sessionId,
          activityId: sleepActivityId,
          status: 'running',
          experience: 'track',
          startedAt: now,
          endedAt: null,
          targetSeconds: null,
          intention: null,
          createdAt: now,
          updatedAt: now,
        };
        const interval: Interval = {
          id: generateUUID(),
          sessionId,
          activityId: sleepActivityId,
          kind: 'sleep',
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
   * Wake up: closes the open sleep interval/session and records a wake
   * marker in the same transaction. Returns the completed session plus the
   * slept duration so the UI can reveal a short dawn summary.
   */
  async wakeUp(customTimeMs?: number, note?: string): Promise<{ session: Session; sleptMs: number; marker: WakeMarker }> {
    return await this.withLock(`sleep:wake:${customTimeMs ?? 'now'}`, async () => {
      const now = customTimeMs ?? this.clock.now();
      return await this.db.transaction(async () => {
        const current = await this.repo.getCurrentSession();
        if (!current) {
          throw new Error('NO_ACTIVE_SESSION: Nothing to wake from.');
        }
        if (current.openInterval?.kind !== 'sleep') {
          throw new Error('NOT_SLEEPING: The current session is not sleep.');
        }
        this.requireMonotonic(now, current.openInterval.startMs);
        const sleptMs = Math.max(1, now - current.openInterval.startMs);
        current.openInterval.endMs = now;
        await this.repo.saveInterval(current.openInterval);
        const completed: Session = {
          ...current.session,
          status: 'completed',
          endedAt: now,
          updatedAt: now,
        };
        await this.repo.saveSession(completed);
        this.lastCompletedSession = completed;
        const marker: WakeMarker = {
          id: generateUUID(),
          timestampMs: now,
          source: 'manual',
          note: note ?? null,
        };
        await this.repo.saveWakeMarker(marker);
        await this.repo.updateSettings({ lastWakeMarkerMs: now });
        return { session: completed, sleptMs, marker };
      });
    });
  }

  /** True when the live open interval is a sleep record. */
  async isSleeping(): Promise<boolean> {
    const current = await this.repo.getCurrentSession();
    return current?.openInterval?.kind === 'sleep';
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
    elapsedSleepMs: number;
    totalElapsedMs: number;
    sleeping: boolean;
  }> {
    const now = this.clock.now();
    const current = await this.repo.getCurrentSession();
    if (!current) {
      return {
        session: null,
        openInterval: null,
        elapsedActiveMs: 0,
        elapsedPauseMs: 0,
        elapsedSleepMs: 0,
        totalElapsedMs: 0,
        sleeping: false,
      };
    }

    const { session, openInterval } = current;
    const intervals = await this.repo.getIntervals(session.startedAt, now);
    const sessionIntervals = intervals.filter((i) => i.sessionId === session.id);

    let elapsedActiveMs = 0;
    let elapsedPauseMs = 0;
    let elapsedSleepMs = 0;

    for (const inv of sessionIntervals) {
      const start = inv.startMs;
      const end = inv.endMs ?? now;
      const duration = Math.max(0, end - start);

      if (inv.kind === 'active') {
        elapsedActiveMs += duration;
      } else if (inv.kind === 'pause') {
        elapsedPauseMs += duration;
      } else if (inv.kind === 'sleep') {
        elapsedSleepMs += duration;
      }
    }

    const totalElapsedMs = Math.max(0, now - session.startedAt);

    return {
      session,
      openInterval,
      elapsedActiveMs,
      elapsedPauseMs,
      elapsedSleepMs,
      totalElapsedMs,
      sleeping: openInterval?.kind === 'sleep',
    };
  }
}
