import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  UserSettings,
  WakeMarker,
} from '../domain/types';
import { computeDayAccounting, formatLocalDate } from '../domain/dayCalculator';
import { DEFAULT_SETTINGS } from './schema';
import {
  cancelAllScheduledReminders,
  scheduleIdleReminder,
  schedulePauseReminder,
} from '../platform/notifications';

interface AppContextType {
  isReady: boolean;
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
  startSession: (activityId: string, targetSeconds?: number) => Promise<void>;
  pauseSession: (reason?: string) => Promise<void>;
  resumeSession: () => Promise<void>;
  finishSession: () => Promise<void>;
  switchSession: (newActivityId: string) => Promise<void>;
  labelPauseInterval: (intervalId: string, reason: string) => Promise<void>;
  splitUntrackedGap: (
    gapStartMs: number,
    gapEndMs: number,
    segments: Array<{ activityId: string; durationMs: number; reason?: string }>
  ) => Promise<void>;
  recordWake: (note?: string) => Promise<void>;
  updateUserSettings: (partial: Partial<UserSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  isReady: false,
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
  startSession: async () => {},
  pauseSession: async () => {},
  resumeSession: async () => {},
  finishSession: async () => {},
  switchSession: async () => {},
  labelPauseInterval: async () => {},
  splitUntrackedGap: async () => {},
  recordWake: async () => {},
  updateUserSettings: async () => {},
  refresh: async () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
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

  const tickerRef = useRef<any>(null);

  const loadData = useCallback(async (r: Repository, te: TimeEngine) => {
    try {
      const sets = await r.getSettings();
      const cats = await r.getCategories();
      const acts = await r.getActivities(false);
      const cur = await r.getCurrentSession();

      const todayStr = formatLocalDate(new Date());
      const nowMs = Date.now();
      const intervals = await r.getIntervals();
      const sessions = await r.getSessions();
      const priorities = await r.getPrioritiesForDate(todayStr);
      const wakeMarker = await r.getWakeMarkerForDate(todayStr);

      const accounting = computeDayAccounting(todayStr, nowMs, intervals, sessions, acts, cats);

      setSettings(sets);
      setCategories(cats);
      setActivities(acts);
      setCurrentSession(cur?.session ?? null);
      setOpenInterval(cur?.openInterval ?? null);
      setTodayAccounting(accounting);
      setTodayPriorities(priorities);
      setTodayWakeMarker(wakeMarker);

      if (cur?.session && !selectedActivity) {
        const matchingAct = acts.find((a) => a.id === cur.session.activityId);
        if (matchingAct) setSelectedActivity(matchingAct);
      } else if (!selectedActivity && acts.length > 0) {
        setSelectedActivity(acts[0]);
      }
    } catch (err) {
      console.error('Error loading VIGIL data:', err);
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
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Live render ticker
  useEffect(() => {
    if (!currentSession) {
      setLiveElapsedSeconds(0);
      setLivePauseSeconds(0);
      if (tickerRef.current) clearInterval(tickerRef.current);
      return;
    }

    const updateTicker = async () => {
      if (!timeEngine) return;
      const state = await timeEngine.getCurrentState();
      setLiveElapsedSeconds(Math.floor(state.elapsedActiveMs / 1000));
      setLivePauseSeconds(Math.floor(state.elapsedPauseMs / 1000));
    };

    updateTicker();
    tickerRef.current = setInterval(updateTicker, 1000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [currentSession, timeEngine]);

  const refresh = useCallback(async () => {
    if (repo && timeEngine) {
      await loadData(repo, timeEngine);
    }
  }, [repo, timeEngine, loadData]);

  const startSession = async (activityId: string, targetSeconds?: number) => {
    if (!timeEngine) return;
    const session = await timeEngine.start(activityId, undefined, targetSeconds);
    setCurrentSession(session);
    await cancelAllScheduledReminders();
    await refresh();
  };

  const pauseSession = async (reason?: string) => {
    if (!timeEngine) return;
    const session = await timeEngine.pause(reason);
    setCurrentSession(session);
    const act = activities.find((a) => a.id === session.activityId);
    await schedulePauseReminder(settings, act?.name);
    await refresh();
  };

  const resumeSession = async () => {
    if (!timeEngine) return;
    const session = await timeEngine.resume();
    setCurrentSession(session);
    await cancelAllScheduledReminders();
    await refresh();
  };

  const finishSession = async () => {
    if (!timeEngine) return;
    await timeEngine.finish();
    setCurrentSession(null);
    setOpenInterval(null);
    await cancelAllScheduledReminders();
    await scheduleIdleReminder(settings);
    await refresh();
  };

  const switchSession = async (newActivityId: string) => {
    if (!timeEngine) return;
    const session = await timeEngine.switchActivity(newActivityId);
    setCurrentSession(session);
    await cancelAllScheduledReminders();
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
        startSession,
        pauseSession,
        resumeSession,
        finishSession,
        switchSession,
        labelPauseInterval,
        splitUntrackedGap,
        recordWake,
        updateUserSettings,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
