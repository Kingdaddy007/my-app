import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { getDatabase } from './database';
import { Repository } from './repository';
import { TimeEngine } from '../domain/timeEngine';
import {
  Activity,
  ActivityCategory,
  DayAccounting,
  Interval,
  Priority,
  Session,
  SessionStartOptions,
  UserSettings,
  WakeMarker,
} from '../domain/types';
import { computeDayAccounting, formatLocalDate } from '../domain/dayCalculator';
import { DEFAULT_SETTINGS } from './schema';
import {
  cancelAllScheduledReminders,
  reconcileRemindersOnForeground,
  scheduleFocusTargetReminder,
  scheduleIdleReminder,
  schedulePauseReminder,
} from '../platform/notifications';

interface AppContextType {
  isReady: boolean;
  appError: string | null;
  repo: Repository | null;
  timeEngine: TimeEngine | null;
  settings: UserSettings;
  categories: ActivityCategory[];
  activities: Activity[];
  currentSession: Session | null;
  openInterval: Interval | null;
  selectedActivity: Activity | null;
  setSelectedActivity: (act: Activity | null) => void;
  todayAccounting: DayAccounting | null;
  todayPriorities: Priority[];
  todayWakeMarker: WakeMarker | null;
  liveElapsedSeconds: number;
  livePauseSeconds: number;
  liveSleepSeconds: number;
  sleeping: boolean;
  startSession: (activityId: string, options?: SessionStartOptions | number) => Promise<void>;
  pauseSession: (reason?: string) => Promise<void>;
  resumeSession: () => Promise<void>;
  finishSession: () => Promise<void>;
  startSleepSession: (sleepActivityId: string) => Promise<void>;
  wakeUpSession: (note?: string) => Promise<{ sleptMs: number } | null>;
  extendFocusTarget: (extraSeconds: number) => Promise<void>;
  switchSession: (newActivityId: string, options?: SessionStartOptions) => Promise<void>;
  labelPauseInterval: (intervalId: string, reason: string) => Promise<void>;
  splitUntrackedGap: (
    gapStartMs: number,
    gapEndMs: number,
    segments: Array<{ activityId: string; durationMs: number; reason?: string }>
  ) => Promise<void>;
  recordWake: (note?: string) => Promise<void>;
  updateUserSettings: (partial: Partial<UserSettings>) => Promise<void>;
  refresh: () => Promise<void>;
  retryLoad: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  isReady: false,
  appError: null,
  repo: null,
  timeEngine: null,
  settings: DEFAULT_SETTINGS,
  categories: [],
  activities: [],
  currentSession: null,
  openInterval: null,
  selectedActivity: null,
  setSelectedActivity: () => {},
  todayAccounting: null,
  todayPriorities: [],
  todayWakeMarker: null,
  liveElapsedSeconds: 0,
  livePauseSeconds: 0,
  liveSleepSeconds: 0,
  sleeping: false,
  startSession: async () => {},
  pauseSession: async () => {},
  resumeSession: async () => {},
  finishSession: async () => {},
  startSleepSession: async () => {},
  wakeUpSession: async () => null,
  extendFocusTarget: async () => {},
  switchSession: async () => {},
  labelPauseInterval: async () => {},
  splitUntrackedGap: async () => {},
  recordWake: async () => {},
  updateUserSettings: async () => {},
  refresh: async () => {},
  retryLoad: async () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [repo, setRepo] = useState<Repository | null>(null);
  const [timeEngine, setTimeEngine] = useState<TimeEngine | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [openInterval, setOpenInterval] = useState<Interval | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [todayAccounting, setTodayAccounting] = useState<DayAccounting | null>(null);
  const [todayPriorities, setTodayPriorities] = useState<Priority[]>([]);
  const [todayWakeMarker, setTodayWakeMarker] = useState<WakeMarker | null>(null);

  // Live timer tick values (pure UI ticker, no per-second DB writes)
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [livePauseSeconds, setLivePauseSeconds] = useState(0);
  const [liveSleepSeconds, setLiveSleepSeconds] = useState(0);
  const sleeping = openInterval?.kind === 'sleep';

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentDateRef = useRef<string>(formatLocalDate(new Date()));
  /**
   * In-memory display baseline. The 1s ticker derives visible elapsed time
   * from this snapshot plus wall-clock delta — no database or native-module
   * work per tick. Re-baselined on every refresh (session transitions only).
   */
  const baselineRef = useRef<{
    sessionId: string | null;
    status: string | null;
    openKind: string | null;
    activeMs: number;
    pauseMs: number;
    sleepMs: number;
    atMs: number;
  }>({ sessionId: null, status: null, openKind: null, activeMs: 0, pauseMs: 0, sleepMs: 0, atMs: Date.now() });

  const loadData = useCallback(async (r: Repository, te: TimeEngine) => {
    try {
      const sets = await r.getSettings();
      const cats = await r.getCategories();
      const acts = await r.getActivities(false);
      const cur = await r.getCurrentSession();

      const todayStr = formatLocalDate(new Date());
      currentDateRef.current = todayStr;
      const nowMs = Date.now();
      const intervals = await r.getIntervals();
      const sessions = await r.getSessions();
      const priorities = await r.getPrioritiesForDate(todayStr);
      const wakeMarker = await r.getWakeMarkerForDate(todayStr);

      const accounting = computeDayAccounting(
        todayStr,
        nowMs,
        intervals,
        sessions,
        acts,
        cats,
        sets.trackingAwarenessStartedAtMs
      );

      setSettings(sets);
      setCategories(cats);
      setActivities(acts);
      setCurrentSession(cur?.session ?? null);
      setOpenInterval(cur?.openInterval ?? null);
      setTodayAccounting(accounting);
      setTodayPriorities(priorities);
      setTodayWakeMarker(wakeMarker);
      setAppError(null);

      // Re-baseline the memory ticker exactly once per refresh.
      try {
        if (cur?.session) {
          const state = await te.getCurrentState();
          baselineRef.current = {
            sessionId: cur.session.id,
            status: cur.session.status,
            openKind: cur.openInterval?.kind ?? null,
            activeMs: state.elapsedActiveMs,
            pauseMs: state.elapsedPauseMs,
            sleepMs: state.elapsedSleepMs ?? 0,
            atMs: Date.now(),
          };
          setLiveElapsedSeconds(Math.floor(state.elapsedActiveMs / 1000));
          setLivePauseSeconds(Math.floor(state.elapsedPauseMs / 1000));
          setLiveSleepSeconds(Math.floor((state.elapsedSleepMs ?? 0) / 1000));
        } else {
          baselineRef.current = {
            sessionId: null, status: null, openKind: null,
            activeMs: 0, pauseMs: 0, sleepMs: 0, atMs: Date.now(),
          };
          setLiveElapsedSeconds(0);
          setLivePauseSeconds(0);
          setLiveSleepSeconds(0);
        }
      } catch {
        // Display baseline is best-effort; durable truth is unaffected.
      }

      if (cur?.session && !selectedActivity) {
        const matchingAct = acts.find((a) => a.id === cur.session.activityId);
        if (matchingAct) setSelectedActivity(matchingAct);
      } else if (!selectedActivity && acts.length > 0) {
        setSelectedActivity(acts[0]);
      }
    } catch (err) {
      console.error('Error loading AEVIA data:', err);
      setAppError(err instanceof Error ? err.message : 'Unable to load local AEVIA data.');
    }
  }, [selectedActivity]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { repo: r, timeEngine: te } = await getDatabase();
        if (isMounted) {
          setRepo(r);
          setTimeEngine(te);
          await loadData(r, te);
          setIsReady(true);
        }
      } catch (err) {
        console.error('Failed to init DB:', err);
        if (isMounted) {
          setAppError(err instanceof Error ? err.message : 'Unable to open the local database.');
          setIsReady(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Live render ticker (memory-only) & midnight day-rollover monitor.
  // No database reads, no settings reads, no native-module calls per tick.
  useEffect(() => {
    const updateTicker = () => {
      // 1. Check if date crossed midnight in the foreground
      const nowDayStr = formatLocalDate(new Date());
      if (nowDayStr !== currentDateRef.current) {
        currentDateRef.current = nowDayStr;
        if (repo && timeEngine) {
          void loadData(repo, timeEngine);
        }
        return;
      }

      // 2. Derive visible elapsed time from the refresh baseline.
      const base = baselineRef.current;
      if (
        currentSession &&
        base.sessionId === currentSession.id &&
        base.status === currentSession.status &&
        base.openKind === (openInterval?.kind ?? null)
      ) {
        const deltaMs = Math.max(0, Date.now() - base.atMs);
        const openGrows = base.status === 'running';
        const activeMs = base.activeMs + (openGrows && base.openKind === 'active' ? deltaMs : 0);
        const sleepMs = base.sleepMs + (openGrows && base.openKind === 'sleep' ? deltaMs : 0);
        const pauseMs = base.pauseMs + (base.status === 'paused' && base.openKind === 'pause' ? deltaMs : 0);
        setLiveElapsedSeconds(Math.floor(activeMs / 1000));
        setLivePauseSeconds(Math.floor(pauseMs / 1000));
        setLiveSleepSeconds(Math.floor(sleepMs / 1000));
      } else if (!currentSession && base.sessionId !== null) {
        setLiveElapsedSeconds(0);
        setLivePauseSeconds(0);
        setLiveSleepSeconds(0);
      }
    };

    updateTicker();
    tickerRef.current = setInterval(updateTicker, 1000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id, currentSession?.status, openInterval?.kind, repo, timeEngine]);

  // Foreground reconciliation: persistence + notifications only on lifecycle
  // transitions, never on the visual timer.
  const reconcileRef = useRef({ repo, timeEngine, settings, currentSession });
  reconcileRef.current = { repo, timeEngine, settings, currentSession };
  useEffect(() => {
    const persist = async (partial: Partial<UserSettings>) => {
      const { repo: r } = reconcileRef.current;
      if (r) {
        try {
          await r.updateSettings(partial);
        } catch {
          // Best-effort only.
        }
      }
      setSettings((prev) => ({ ...prev, ...partial }));
    };
    const onForeground = () => {
      const { repo: r, timeEngine: te, settings: s, currentSession: cur } = reconcileRef.current;
      if (!r || !te) return;
      void (async () => {
        try {
          const latest = await r.getCurrentSession();
          await reconcileRemindersOnForeground(s, !!latest, persist);
          // Re-baseline display truth after background time passed.
          await loadData(r, te);
        } catch {
          // Best-effort only.
        }
      })();
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onForeground();
    });
    return () => subscription.remove();
  }, [loadData]);

  const refresh = useCallback(async () => {
    if (repo && timeEngine) {
      await loadData(repo, timeEngine);
    }
  }, [repo, timeEngine, loadData]);

  const retryLoad = useCallback(async () => {
    try {
      const { repo: r, timeEngine: te } = await getDatabase();
      setRepo(r);
      setTimeEngine(te);
      await loadData(r, te);
      setIsReady(true);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'Unable to open the local database.');
      setIsReady(true);
    }
  }, [loadData]);

  const persistSettingsState = useCallback(
    async (partial: Partial<UserSettings>) => {
      if (repo) {
        try {
          await repo.updateSettings(partial);
        } catch {
          // Scheduling success must never roll back on a settings-write failure.
        }
      }
      setSettings((prev) => ({ ...prev, ...partial }));
    },
    [repo]
  );

  /**
   * Focus target chime: scheduled only for a live Focus session with a target
   * and only when the user explicitly enabled it. Remaining time is measured
   * in active (not wall-clock) time so pauses never fire it early.
   */
  const maybeScheduleFocusChime = useCallback(
    async (session: Session, activeElapsedMs: number) => {
      if (
        session.experience !== 'focus' ||
        session.targetSeconds == null ||
        !settings.focusTargetReminderEnabled
      ) {
        return;
      }
      const remainingMs = session.targetSeconds * 1000 - activeElapsedMs;
      if (!Number.isFinite(remainingMs) || remainingMs <= 5000) return;
      const act = activities.find((a) => a.id === session.activityId);
      await scheduleFocusTargetReminder(settings, Date.now() + remainingMs, act?.name, {
        persistSettings: persistSettingsState,
      });
    },
    [settings, activities, persistSettingsState]
  );

  const startSession = async (activityId: string, input?: SessionStartOptions | number) => {
    if (!timeEngine) return;
    const options: SessionStartOptions =
      typeof input === 'number'
        ? { experience: 'focus', targetSeconds: input }
        : input ?? { experience: 'track' };
    const session = await timeEngine.start(activityId, undefined, options);
    setCurrentSession(session);
    if (!settings.trackingAwarenessStartedAtMs && repo) {
      const awareness = Date.now();
      await repo.updateSettings({ trackingAwarenessStartedAtMs: awareness });
      setSettings((prev) => ({ ...prev, trackingAwarenessStartedAtMs: awareness }));
    }
    if (session.experience === 'focus') {
      await maybeScheduleFocusChime(session, 0);
    } else {
      await cancelAllScheduledReminders(settings, persistSettingsState);
    }
    await refresh();
  };

  const pauseSession = async (reason?: string) => {
    if (!timeEngine) return;
    const session = await timeEngine.pause(reason);
    setCurrentSession(session);
    const act = activities.find((a) => a.id === session.activityId);
    await schedulePauseReminder(settings, act?.name, {
      persistSettings: async (partial) => {
        if (repo) await repo.updateSettings(partial);
        setSettings((prev) => ({ ...prev, ...partial }));
      },
    });
    await refresh();
  };

  const resumeSession = async () => {
    if (!timeEngine) return;
    const session = await timeEngine.resume();
    setCurrentSession(session);
    if (session.experience === 'focus') {
      await maybeScheduleFocusChime(session, liveElapsedSeconds * 1000);
    } else {
      await cancelAllScheduledReminders(settings, persistSettingsState);
    }
    await refresh();
  };

  const finishSession = async () => {
    if (!timeEngine) return;
    await timeEngine.finish();
    setCurrentSession(null);
    setOpenInterval(null);
    await scheduleIdleReminder(settings, {
      persistSettings: persistSettingsState,
    });
    await refresh();
  };

  const startSleepSession = async (sleepActivityId: string) => {
    if (!timeEngine) return;
    const session = await timeEngine.startSleep(sleepActivityId);
    setCurrentSession(session);
    if (!settings.trackingAwarenessStartedAtMs && repo) {
      const awareness = Date.now();
      await repo.updateSettings({ trackingAwarenessStartedAtMs: awareness });
      setSettings((prev) => ({ ...prev, trackingAwarenessStartedAtMs: awareness }));
    }
    // Sleep suppresses all check-ins; cancel anything pending.
    await cancelAllScheduledReminders(settings, persistSettingsState);
    await refresh();
  };

  const wakeUpSession = async (note?: string) => {
    if (!timeEngine) return null;
    const result = await timeEngine.wakeUp(undefined, note);
    setCurrentSession(null);
    setOpenInterval(null);
    await scheduleIdleReminder(settings, {
      persistSettings: persistSettingsState,
    });
    await refresh();
    return { sleptMs: result.sleptMs };
  };

  const extendFocusTarget = async (extraSeconds: number) => {
    if (!timeEngine) return;
    const session = await timeEngine.extendFocusTarget(extraSeconds);
    setCurrentSession(session);
    // Re-anchor the opt-in chime to the extended target (replaces, no quota).
    await maybeScheduleFocusChime(session, liveElapsedSeconds * 1000);
    await refresh();
  };

  const switchSession = async (newActivityId: string, options?: SessionStartOptions) => {
    if (!timeEngine) return;
    const session = await timeEngine.switchActivity(newActivityId, undefined, options);
    setCurrentSession(session);
    if (session.experience === 'focus') {
      await maybeScheduleFocusChime(session, 0);
    } else {
      await cancelAllScheduledReminders(settings, persistSettingsState);
    }
    await refresh();
  };

  const labelPauseInterval = async (intervalId: string, reason: string) => {
    if (!timeEngine) return;
    await timeEngine.labelPause(intervalId, reason);
    await refresh();
  };

  const splitUntrackedGap = async (
    gapStartMs: number,
    gapEndMs: number,
    segments: Array<{ activityId: string; durationMs: number; reason?: string }>
  ) => {
    if (!timeEngine) return;
    await timeEngine.splitGap(gapStartMs, gapEndMs, segments);
    await refresh();
  };

  const recordWake = async (note?: string) => {
    if (!timeEngine) return;
    await timeEngine.recordWakeMarker(undefined, note);
    await refresh();
  };

  const updateUserSettings = async (partial: Partial<UserSettings>) => {
    if (!repo) return;
    await repo.updateSettings(partial);
    setSettings((prev) => ({ ...prev, ...partial }));
    await refresh();
  };

  return (
    <AppContext.Provider
      value={{
        isReady,
        appError,
        repo,
        timeEngine,
        settings,
        categories,
        activities,
        currentSession,
        openInterval,
        selectedActivity,
        setSelectedActivity,
        todayAccounting,
        todayPriorities,
        todayWakeMarker,
        liveElapsedSeconds,
        livePauseSeconds,
        liveSleepSeconds,
        sleeping,
        startSession,
        pauseSession,
        resumeSession,
        finishSession,
        startSleepSession,
        wakeUpSession,
        extendFocusTarget,
        switchSession,
        labelPauseInterval,
        splitUntrackedGap,
        recordWake,
        updateUserSettings,
        refresh,
        retryLoad,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
