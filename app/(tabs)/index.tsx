import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/ThemeContext';
import { useApp } from '../../src/data/AppContext';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { ModalSheet } from '../../src/ui/components/ModalSheet';
import { LivingHero } from '../../src/ui/living/LivingHero';
import { ErrorState } from '../../src/ui/living/ErrorState';
import { radii, spacing, typography } from '../../src/ui/tokens';
import { generateFactualInsights } from '../../src/domain/insights';
import { deriveLivingDayState, formatLivingDuration, formatSleptSummary } from '../../src/domain/dayState';
import { getLocalDayBounds } from '../../src/domain/dayCalculator';
import { Activity, SessionExperience, SessionStartOptions } from '../../src/domain/types';

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setPreference } = useTheme();
  const {
    isReady,
    appError,
    settings,
    repo,
    timeEngine,
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
    updateUserSettings,
    refresh,
    retryLoad,
  } = useApp();

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [undoGapInfo, setUndoGapInfo] = useState<{ gapStart: number; duration: number; activityName: string } | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<SessionExperience>('focus');
  const [focusMinutes, setFocusMinutes] = useState(45);
  const [intention, setIntention] = useState('');
  const [overtimeAcknowledged, setOvertimeAcknowledged] = useState(false);
  const [pendingSwitchActivity, setPendingSwitchActivity] = useState<Activity | null>(null);
  const [dawnSummary, setDawnSummary] = useState<{ sleptMs: number } | null>(null);
  const [pauseSavedTick, setPauseSavedTick] = useState(0);

  useEffect(() => {
    if (isReady && !settings.hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [isReady, settings.hasCompletedOnboarding]);

  useEffect(() => {
    setOvertimeAcknowledged(false);
  }, [currentSession?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';
    if (settings.profileName) return `${timeGreeting}, ${settings.profileName}`;
    return timeGreeting;
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const formatTimeHM = (timestampMs: number) => {
    const d = new Date(timestampMs);
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const sessionStatus = currentSession?.status ?? 'idle';
  const activeActivity = activities.find((a) => a.id === currentSession?.activityId) ?? selectedActivity;

  const living = useMemo(() => {
    const now = Date.now();
    const day = todayAccounting
      ? { start: todayAccounting.dayStartMs, end: todayAccounting.dayEndMs }
      : (() => {
          try {
            const b = getLocalDayBounds(new Date().toISOString().slice(0, 10));
            return { start: b.dayStartMs, end: b.dayEndMs };
          } catch {
            return { start: now, end: now + 86400000 };
          }
        })();
    return deriveLivingDayState({
      session: currentSession,
      openInterval,
      elapsedActiveMs: liveElapsedSeconds * 1000,
      elapsedPauseMs: livePauseSeconds * 1000,
      elapsedSleepMs: liveSleepSeconds * 1000,
      totalElapsedMs:
        sleeping ? liveSleepSeconds * 1000 : liveElapsedSeconds * 1000 + livePauseSeconds * 1000,
      dayStartMs: day.start,
      dayEndMs: day.end,
      nowMs: now,
    });
  }, [currentSession, openInterval, liveElapsedSeconds, livePauseSeconds, liveSleepSeconds, sleeping, todayAccounting]);

  const insights = todayAccounting
    ? generateFactualInsights(todayAccounting, todayWakeMarker, todayPriorities)
    : [];

  const recentGap = todayAccounting?.gaps && todayAccounting.gaps.length > 0
    ? todayAccounting.gaps[todayAccounting.gaps.length - 1]
    : null;

  const handleQuickLabelGap = async (act: Activity) => {
    if (!recentGap) return;
    try {
      const start = recentGap.startMs;
      const end = recentGap.endMs;
      const dur = recentGap.durationMs;
      await splitUntrackedGap(start, end, [
        { activityId: act.id, durationMs: dur, reason: act.name },
      ]);
      setUndoGapInfo({ gapStart: start, duration: dur, activityName: act.name });
    } catch (err: unknown) {
      Alert.alert('Unable to label gap', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const handleUndoQuickLabel = async () => {
    if (!undoGapInfo || !repo) return;
    try {
      const intervals = await repo.getIntervals(undoGapInfo.gapStart, undoGapInfo.gapStart + undoGapInfo.duration);
      const target = intervals.find((i) => i.kind === 'manual' && i.startMs === undoGapInfo.gapStart);
      if (target && timeEngine) {
        await timeEngine.deleteInterval(target.id);
      }
      setUndoGapInfo(null);
      await refresh();
    } catch (err: unknown) {
      Alert.alert('Undo failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const targetSec = currentSession?.experience === 'focus'
    ? currentSession.targetSeconds ?? null
    : sessionStatus === 'idle' && selectedExperience === 'focus'
    ? focusMinutes * 60
    : null;
  const focusHasReachedTarget = living.focusReached;
  const heroTimerMs = sleeping
    ? living.elapsedSleepMs
    : sessionStatus === 'idle'
    ? (targetSec ?? 0) * 1000
    : living.focusTargetMs != null && currentSession?.experience === 'focus'
    ? focusHasReachedTarget
      ? living.overtimeMs
      : living.remainingMs
    : living.elapsedActiveMs;
  const heroTimerLabel = sleeping
    ? 'SLEEPING'
    : sessionStatus === 'idle'
    ? selectedExperience === 'focus'
      ? 'FOCUS TARGET'
      : 'OPEN-ENDED TRACK'
    : sessionStatus === 'running'
    ? focusHasReachedTarget
      ? 'OVERTIME · TARGET REACHED'
      : currentSession?.experience === 'focus'
      ? 'FOCUSING'
      : 'TRACKING'
    : `PAUSED · ${Math.floor(livePauseSeconds / 60)}M PAUSE`;
  const heroTitle = sleeping
    ? 'Sleeping'
    : activeActivity?.name ?? 'Choose an activity';
  const heroSubtitle = sleeping
    ? 'The day is resting. Wake to return.'
    : sessionStatus === 'idle'
    ? selectedExperience === 'focus'
      ? `${focusMinutes}-minute focus · ${intention.trim() ? `“${intention.trim()}”` : 'add an intention below'}`
      : 'Open-ended track · pause anytime, finish when done'
    : currentSession?.experience === 'focus' && currentSession.intention
    ? `“${currentSession.intention}”`
    : currentSession?.experience === 'focus' && targetSec
    ? `${formatLivingDuration(living.elapsedActiveMs)} active · ${Math.round(targetSec / 60)}m target`
    : `${formatLivingDuration(living.elapsedActiveMs)} active · ${formatLivingDuration(living.elapsedPauseMs)} paused`;

  const selectedStartOptions = (): SessionStartOptions =>
    selectedExperience === 'focus'
      ? { experience: 'focus', targetSeconds: focusMinutes * 60, intention: intention.trim() || null }
      : { experience: 'track', intention: intention.trim() || null };

  const runSessionAction = async (action: () => Promise<void>, title = 'Session action unavailable') => {
    try {
      await action();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const startSelectedSession = async (activity = activeActivity) => {
    if (!activity) {
      setIsPickerVisible(true);
      return;
    }
    await runSessionAction(() => startSession(activity.id, selectedStartOptions()), 'Could not start session');
  };

  const handleSleepPress = async () => {
    const sleepAct = activities.find((a) => a.name.toLowerCase() === 'sleep')
      ?? activities.find((a) => a.categoryId === 'cat-sleep');
    if (!sleepAct) {
      Alert.alert('Sleep activity missing', 'Add a Sleep activity before starting sleep mode.');
      return;
    }
    await runSessionAction(() => startSleepSession(sleepAct.id), 'Could not start sleep');
  };

  const handleWakePress = async () => {
    const result = await wakeUpSession().catch((error) => {
      Alert.alert('Could not wake', error instanceof Error ? error.message : 'Please try again.');
      return null;
    });
    if (result) setDawnSummary(result);
  };

  if (isReady && appError && !repo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <ErrorState colors={colors} message={appError} onRetry={() => void retryLoad()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: sleeping ? '#0A1017' : colors.canvas }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
      ]}
    >
      {/* Top Bar: Wordmark, Date, Theme Toggle & Settings */}
      <View style={styles.topBar}>
        <View>
          <Text style={[typography.metadata, { color: colors.primaryAction, letterSpacing: 2.5 }]}>
            A E V I A
          </Text>
          <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 2 }]}>
            {formattedDate.toUpperCase()}
          </Text>
        </View>

        {sleeping ? null : <View style={styles.topActions}>
          {settings.profileName ? (
            <View style={[styles.avatarCircle, { backgroundColor: colors.actionSubtle }]}>
              <Text style={[typography.metadata, { color: colors.primaryAction, fontWeight: '700' }]}>
                {settings.profileName.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              const next = mode === 'dark' ? 'light' : 'dark';
              setPreference(next);
              void updateUserSettings({ themePreference: next });
            }}
            style={[styles.topBtn, { backgroundColor: colors.surfaceRaised, marginLeft: settings.profileName ? 8 : 0 }]}
            accessibilityRole="button"
            accessibilityLabel="Toggle Light or Dark Theme"
          >
            <AppIcon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={colors.primaryAction} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.topBtn, { backgroundColor: colors.surfaceRaised, marginLeft: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <AppIcon name="settings" size={18} color={colors.primaryText} />
          </Pressable>
        </View>}
      </View>

      {/* Greeting Header */}
      <View style={styles.greetingHeader}>
        <Text style={[typography.greeting, { color: sleeping ? '#E0E7FF' : colors.primaryText }]}>
          {sleeping ? 'Resting' : getGreeting()}
        </Text>
        <Text style={[typography.body, { color: colors.secondaryText, marginTop: 4 }]}>
          {sleeping
            ? 'Sleep is being recorded. One action waits below.'
            : sessionStatus === 'running'
            ? 'Stay present. One moment at a time.'
            : sessionStatus === 'paused'
            ? 'Taking a breath. Resume when you are ready.'
            : 'What are you giving your time to?'}
        </Text>
      </View>

      {/* The Living Day hero: one state-responsive world */}
      <LivingHero
        phase={living.phase}
        timerMs={heroTimerMs}
        timerLabel={heroTimerLabel}
        title={heroTitle}
        subtitle={heroSubtitle}
        timerAccessibilityLabel={`${heroTimerLabel}, ${formatLivingDuration(heroTimerMs)}`}
        dayProgress={living.dayArcProgress}
        compact={true}
      />

      {/* Only the contextually valid primary action appears */}
      <View style={{ marginTop: 16 }}>
        {living.phase === 'sleeping' ? (
          <Button
            label="I'm awake"
            size="large"
            icon={<AppIcon name="sun" size={22} color={colors.onPrimaryAction} />}
            onPress={() => void handleWakePress()}
            accessibilityHint="Ends sleep and shows a short dawn summary"
          />
        ) : sessionStatus === 'idle' ? (
          <View
            style={[
              styles.sessionComposer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Pressable
              onPress={() => setIsPickerVisible(true)}
              style={({ pressed }) => [styles.activityLead, { opacity: pressed ? 0.72 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`Choose activity, currently ${activeActivity?.name ?? 'none selected'}`}
            >
              <View style={[styles.activityLeadIcon, { backgroundColor: colors.actionSubtle }]}>
                <AppIcon name={activeActivity?.iconKey ?? 'laptop'} size={21} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.metadata, { color: colors.secondaryText, letterSpacing: 1.25 }]}>BEGIN WITH</Text>
                <Text style={[typography.sectionTitle, { color: colors.primaryText, marginTop: 2 }]} numberOfLines={1}>
                  {activeActivity?.name ?? 'Choose an activity'}
                </Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.secondaryText} />
            </Pressable>

            <View style={[styles.experienceRail, { backgroundColor: colors.surfaceRaised }]}>
                <Pressable
                  onPress={() => setSelectedExperience('track')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedExperience === 'track' }}
                  accessibilityLabel="Track, open-ended timer"
                  style={[
                    styles.experienceOption,
                    {
                      backgroundColor: selectedExperience === 'track' ? colors.primaryAction : 'transparent',
                    },
                  ]}
                >
                  <AppIcon name="time" size={17} color={selectedExperience === 'track' ? colors.onPrimaryAction : colors.secondaryText} />
                  <Text style={[typography.bodyMedium, { color: selectedExperience === 'track' ? colors.onPrimaryAction : colors.secondaryText, marginLeft: 7 }]}>Track</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedExperience('focus')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedExperience === 'focus' }}
                  accessibilityLabel={`Focus, ${focusMinutes} minute target`}
                  style={[
                    styles.experienceOption,
                    {
                      backgroundColor: selectedExperience === 'focus' ? colors.primaryAction : 'transparent',
                    },
                  ]}
                >
                  <AppIcon name="target" size={17} color={selectedExperience === 'focus' ? colors.onPrimaryAction : colors.secondaryText} />
                  <Text style={[typography.bodyMedium, { color: selectedExperience === 'focus' ? colors.onPrimaryAction : colors.secondaryText, marginLeft: 7 }]}>Focus · {focusMinutes}m</Text>
                </Pressable>
            </View>

              {selectedExperience === 'focus' ? (
                <View style={styles.focusSetup}>
                  <View style={styles.presetRow}>
                    {[25, 45, 60, 90].map((minutes) => (
                      <Pressable
                        key={minutes}
                        onPress={() => setFocusMinutes(minutes)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: focusMinutes === minutes }}
                        accessibilityLabel={`${minutes} minute Focus target${minutes === 45 ? ', recommended' : ''}`}
                        style={[
                          styles.preset,
                          {
                            backgroundColor: focusMinutes === minutes ? colors.primaryAction : colors.surfaceRaised,
                            borderColor: focusMinutes === minutes ? colors.primaryAction : colors.border,
                          },
                        ]}
                      >
                        <Text style={[typography.caption, { color: focusMinutes === minutes ? colors.onPrimaryAction : colors.primaryText, fontWeight: '600' }]}>{minutes}m</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            <TextInput
              value={intention}
              onChangeText={setIntention}
              maxLength={160}
              placeholder="What would make this time count? (optional)"
              placeholderTextColor={colors.mutedText}
              accessibilityLabel="Optional session intention"
              style={[styles.intentionInput, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSubtle, color: colors.primaryText }]}
            />
            <Button
              label={selectedExperience === 'focus' ? 'Begin focus' : 'Begin tracking'}
              icon={<AppIcon name="play" size={22} color={colors.onPrimaryAction} />}
              onPress={() => void startSelectedSession()}
              size="large"
              accessibilityHint={selectedExperience === 'focus' ? 'Begins a timed focus session' : 'Begins open-ended tracking'}
            />
          </View>
        ) : sessionStatus === 'running' ? (
          <View style={styles.buttonRow}>
            <Button
              label="Pause"
              variant="secondary"
              icon={<AppIcon name="pause" size={18} color={colors.primaryText} />}
              onPress={() => void runSessionAction(() => pauseSession())}
              style={{ flex: 1, marginRight: 12 }}
            />
            <Button
              label="Finish"
              variant="primary"
              icon={<AppIcon name="check" size={18} color={colors.onPrimaryAction} />}
              onPress={() => void runSessionAction(() => finishSession())}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <Button
              label="Resume"
              variant="primary"
              icon={<AppIcon name="play" size={18} color={colors.onPrimaryAction} />}
              onPress={() => void runSessionAction(() => resumeSession())}
              style={{ flex: 1, marginRight: 12 }}
            />
            <Button
              label="Finish"
              variant="secondary"
              icon={<AppIcon name="check" size={18} color={colors.primaryText} />}
              onPress={() => void runSessionAction(() => finishSession())}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>

      {focusHasReachedTarget && !overtimeAcknowledged && living.phase !== 'sleeping' ? (
        <Card variant="warm" style={{ marginTop: 16 }}>
          <Text style={[typography.sectionTitle, { color: colors.warmGapText }]}>Your target is complete</Text>
          <Text style={[typography.body, { color: colors.warmGapText, marginTop: 4 }]}>The session is still running. Choose what happens next.</Text>
          <View style={[styles.buttonRow, { marginTop: 14, flexWrap: 'wrap', gap: 8 }]}>
            <Button size="small" variant="outline" label="Continue overtime" onPress={() => setOvertimeAcknowledged(true)} style={{ flexGrow: 1 }} />
            <Button size="small" variant="secondary" label="+15 min" onPress={() => void runSessionAction(() => extendFocusTarget(15 * 60))} style={{ flexGrow: 1 }} />
            <Button size="small" label="Finish" onPress={() => void runSessionAction(() => finishSession())} style={{ flexGrow: 1 }} />
          </View>
        </Card>
      ) : null}

      {/* Pause recovery with unmistakable saved-reason feedback */}
      {sessionStatus === 'paused' && living.phase !== 'sleeping' ? (
        <Card variant="warm" style={{ marginTop: 20 }}>
          <View style={styles.gapHeader}>
            <View style={[styles.gapIconCircle, { backgroundColor: colors.warmGapBorder }]}>
              <AppIcon name="pause" size={18} color={colors.warmGapText} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.sectionTitle, { color: colors.warmGapText, fontSize: 16 }]}>
                Pause Reason
              </Text>
              <Text
                style={[typography.caption, { color: colors.warmGapText, opacity: 0.9 }]}
                accessibilityLiveRegion="polite"
              >
                {openInterval?.reason
                  ? `Saved · Labeled as ${openInterval.reason}`
                  : 'Optional — pause is already saved. Add a reason if useful:'}
              </Text>
            </View>
          </View>

          <View style={styles.pillsRow}>
            {['Break', 'Phone call', 'Distraction', 'Rest', 'Other'].map((reason) => {
              const isCurrent = openInterval?.reason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={async () => {
                    if (openInterval) {
                      await labelPauseInterval(openInterval.id, reason);
                      setPauseSavedTick((n) => n + 1);
                    }
                  }}
                  style={[
                    styles.quickTagPill,
                    {
                      backgroundColor: isCurrent ? colors.primaryAction : colors.surface,
                      borderColor: isCurrent ? colors.primaryAction : colors.warmGapBorder,
                      minHeight: 48,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  accessibilityLabel={isCurrent ? `${reason}, saved` : `Label pause as ${reason}`}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isCurrent ? colors.onPrimaryAction : colors.primaryText,
                        fontWeight: isCurrent ? '700' : '500',
                      },
                    ]}
                  >
                    {isCurrent ? `✓ ${reason}` : reason}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[typography.metadata, { color: colors.warmGapText, marginTop: 8, opacity: pauseSavedTick >= 0 ? 1 : 0 }]}>
            Pause time is preserved separately from active time.
          </Text>
        </Card>
      ) : null}

      {/* Priorities preview (hidden while sleeping: one action only) */}
      {todayPriorities.length > 0 && living.phase !== 'sleeping' ? (
        <Card variant="subtle" padding={14} style={styles.priorityCard}>
          <View style={styles.priorityHeaderRow}>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>
              TODAY'S PRIORITIES
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/review')}
              style={styles.editPrioritiesBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit priorities in Review"
            >
              <Text style={[typography.metadata, { color: colors.secondaryText }]}>Edit</Text>
            </Pressable>
          </View>
          {todayPriorities.map((p) => {
            const matchingAct = activities.find(
              (a) => a.name.toLowerCase() === p.title.toLowerCase() || p.title.toLowerCase().includes(a.name.toLowerCase())
            );
            return (
              <View key={p.id} style={styles.priorityRow}>
                <Pressable
                  onPress={async () => {
                    if (!repo) return;
                    p.completedAt = p.completedAt ? null : Date.now();
                    await repo.savePriority(p);
                    await refresh();
                  }}
                  style={styles.priorityCheckbox}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: p.completedAt != null }}
                  accessibilityLabel={`Mark ${p.title} ${p.completedAt ? 'incomplete' : 'complete'}`}
                >
                  <AppIcon
                    name={p.completedAt ? 'check' : 'time'}
                    size={16}
                    color={p.completedAt ? colors.primaryAction : colors.mutedText}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (matchingAct) setSelectedActivity(matchingAct);
                  }}
                  style={{ flex: 1, marginLeft: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select priority activity ${p.title}`}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: p.completedAt ? colors.mutedText : colors.primaryText,
                        textDecorationLine: p.completedAt ? 'line-through' : 'none',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {p.title}
                  </Text>
                </Pressable>
                {!p.completedAt && sessionStatus === 'idle' ? (
                  <Pressable
                    onPress={() => {
                      if (matchingAct) {
                        void runSessionAction(
                          () => startSession(matchingAct.id, selectedStartOptions()),
                          'Could not start session'
                        );
                      } else if (activeActivity) {
                        void runSessionAction(
                          () => startSession(activeActivity.id, selectedStartOptions()),
                          'Could not start session'
                        );
                      }
                    }}
                    style={[styles.priorityPlayBtn, { backgroundColor: colors.actionSubtle }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${selectedExperience === 'focus' ? `${focusMinutes}-minute focus` : 'tracking'} for ${p.title}`}
                  >
                    <AppIcon name="play" size={14} color={colors.primaryAction} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {/* Untracked Gap Follow-up (idle only, never while running/paused/sleeping) */}
      {recentGap && recentGap.durationMs >= 15 * 60 * 1000 && sessionStatus === 'idle' && living.phase !== 'sleeping' ? (
        <Card variant="warm" style={{ marginTop: 20 }}>
          <View style={styles.gapHeader}>
            <View style={[styles.gapIconCircle, { backgroundColor: colors.warmGapBorder }]}>
              <AppIcon name="hourglass" size={18} color={colors.warmGapText} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.sectionTitle, { color: colors.warmGapText, fontSize: 16 }]}>
                {Math.round(recentGap.durationMs / (60 * 1000))}m untracked
              </Text>
              <Text style={[typography.caption, { color: colors.warmGapText, opacity: 0.85 }]}>
                since {formatTimeHM(recentGap.startMs)} · What were you doing?
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/timeline')}
              style={styles.gapSplitBtn}
              accessibilityRole="button"
              accessibilityLabel="Split or edit gap in Timeline"
            >
              <AppIcon name="time" size={18} color={colors.warmGapText} />
            </Pressable>
          </View>

          <View style={styles.pillsRow}>
            {activities.slice(0, 5).map((act) => (
              <Pressable
                key={act.id}
                onPress={() => void handleQuickLabelGap(act)}
                style={[
                  styles.quickTagPill,
                  { backgroundColor: colors.surface, borderColor: colors.warmGapBorder, minHeight: 48 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Label gap as ${act.name}`}
              >
                <AppIcon name={act.iconKey} size={14} color={colors.primaryAction} />
                <Text style={[typography.caption, { color: colors.primaryText, marginLeft: 6 }]}>
                  {act.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setIsPickerVisible(true)}
              style={[
                styles.quickTagPill,
                { backgroundColor: colors.surface, borderColor: colors.warmGapBorder, minHeight: 48 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select other activity for gap"
            >
              <AppIcon name="add" size={14} color={colors.warmGapText} />
              <Text style={[typography.caption, { color: colors.warmGapText, marginLeft: 4, fontWeight: '600' }]}>
                Other
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      {undoGapInfo ? (
        <Card variant="subtle" padding={12} style={{ marginTop: 10 }}>
          <View style={styles.undoRow}>
            <Text style={[typography.caption, { color: colors.primaryText, flex: 1 }]}>
              Labeled gap as <Text style={{ fontWeight: '700' }}>{undoGapInfo.activityName}</Text>.
            </Text>
            <Button
              label="Undo"
              size="small"
              variant="outline"
              onPress={() => void handleUndoQuickLabel()}
            />
          </View>
        </Card>
      ) : null}

      {/* Sleep entry (idle only): exactly one primary sleep action at a time */}
      {living.phase !== 'sleeping' && sessionStatus === 'idle' ? (
        <View style={{ marginTop: 16 }}>
          <Button
            label="Start sleep"
            variant="outline"
            size="small"
            icon={<AppIcon name="moon" size={16} color={colors.secondaryText} />}
            onPress={() => void handleSleepPress()}
            accessibilityHint="Starts sleep mode. Navigation rests until you wake."
          />
        </View>
      ) : null}

      {/* One factual observation, never invented praise */}
      {living.phase !== 'sleeping' && sessionStatus === 'idle' ? insights.slice(0, 1).map((ins) => (
        <Card key={ins.id} variant="surface" style={{ marginTop: 16 }}>
          <View style={styles.insightRow}>
            <View style={[styles.insightIcon, { backgroundColor: colors.actionSubtle }]}>
              <AppIcon name="sparkles" size={20} color={colors.primaryAction} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.sectionTitle, { color: colors.primaryText, fontSize: 16 }]}>
                {ins.title}
              </Text>
              <Text style={[typography.body, { color: colors.secondaryText, marginTop: 2 }]}>
                {ins.detail}
              </Text>
            </View>
          </View>
        </Card>
      )) : null}

      <ModalSheet
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        title="Select Activity"
      >
        <ScrollView style={{ maxHeight: 380 }}>
          {activities.map((act) => (
            <Pressable
              key={act.id}
              onPress={() => {
                setIsPickerVisible(false);
                if (sessionStatus === 'running' || sessionStatus === 'paused') {
                  if (activeActivity?.id === act.id) return;
                  setPendingSwitchActivity(act);
                } else {
                  setSelectedActivity(act);
                }
              }}
              style={[
                styles.pickerRow,
                {
                  backgroundColor:
                    activeActivity?.id === act.id ? colors.surfaceRaised : 'transparent',
                  minHeight: 56,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${act.name}`}
            >
              <View style={[styles.pickerIcon, { backgroundColor: colors.actionSubtle }]}>
                <AppIcon name={act.iconKey} size={18} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>
                  {act.name}
                </Text>
                {act.targetSeconds ? (
                  <Text style={[typography.metadata, { color: colors.secondaryText }]}>
                    Target: {Math.round(act.targetSeconds / 60)} min
                  </Text>
                ) : null}
              </View>
              {activeActivity?.id === act.id ? (
                <AppIcon name="check" size={20} color={colors.primaryAction} />
              ) : null}
            </Pressable>
          ))}

          <Button
            label="Manage Activities"
            variant="ghost"
            icon={<AppIcon name="add" size={18} color={colors.secondaryText} />}
            onPress={() => {
              setIsPickerVisible(false);
              router.push('/activities');
            }}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </ModalSheet>

      <ModalSheet
        visible={pendingSwitchActivity != null}
        onClose={() => setPendingSwitchActivity(null)}
        title="Finish the current session?"
      >
        <Text style={[typography.body, { color: colors.secondaryText }]}>
          Selecting {pendingSwitchActivity?.name ?? 'another activity'} does not rewrite the live session. Keep {activeActivity?.name ?? 'the current activity'} running, or finish it and begin the new activity as a separate session.
        </Text>
        <View style={[styles.buttonRow, { marginTop: 18, gap: 10 }]}>
          <Button label="Continue current" variant="outline" onPress={() => setPendingSwitchActivity(null)} style={{ flex: 1 }} />
          <Button
            label="Finish and switch"
            onPress={() => {
              const next = pendingSwitchActivity;
              setPendingSwitchActivity(null);
              if (!next) return;
              void runSessionAction(async () => {
                await switchSession(next.id, {
                  experience: currentSession?.experience ?? selectedExperience,
                  targetSeconds: currentSession?.experience === 'focus' ? currentSession?.targetSeconds : selectedExperience === 'focus' ? focusMinutes * 60 : null,
                  intention: currentSession?.intention ?? (intention.trim() || null),
                });
                setSelectedActivity(next);
              }, 'Could not switch activity');
            }}
            style={{ flex: 1 }}
          />
        </View>
      </ModalSheet>

      {/* Dawn summary: short, factual, shown once after waking */}
      <ModalSheet visible={dawnSummary != null} onClose={() => setDawnSummary(null)} title="Morning">
        <Text style={[typography.title, { color: colors.primaryText }]}>
          {dawnSummary ? formatSleptSummary(dawnSummary.sleptMs) : ''}
        </Text>
        <Text style={[typography.body, { color: colors.secondaryText, marginTop: 6 }]}>
          Sleep was recorded as its own interval — not as focus. Timeline and Review already include it.
        </Text>
        <View style={[styles.buttonRow, { marginTop: 18, gap: 10 }]}>
          <Button label="View Timeline" variant="outline" onPress={() => { setDawnSummary(null); router.push('/(tabs)/timeline'); }} style={{ flex: 1 }} />
          <Button label="Begin the day" onPress={() => setDawnSummary(null)} style={{ flex: 1 }} />
        </View>
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.pageGutter,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topActions: {
    flexDirection: 'row',
  },
  topBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingHeader: {
    marginBottom: 16,
  },
  priorityCard: {
    marginBottom: 16,
    marginTop: 16,
  },
  sessionComposer: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 14,
    gap: 12,
  },
  activityLead: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 4,
  },
  activityLeadIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceRail: {
    flexDirection: 'row',
    borderRadius: radii.control,
    padding: 4,
    gap: 4,
  },
  experienceOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusSetup: {
    marginTop: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  preset: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentionInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.control,
    paddingHorizontal: 14,
    marginTop: 10,
    fontSize: 16,
  },
  priorityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editPrioritiesBtn: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
  activityPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  gapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gapIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gapSplitBtn: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wakeSleepRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.control,
  },
  pickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityCheckbox: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
