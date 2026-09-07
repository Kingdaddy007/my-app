import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/ThemeContext';
import { useApp } from '../../src/data/AppContext';
import { MountainLandscape } from '../../src/ui/MountainLandscape';
import { TimerHalo } from '../../src/ui/TimerHalo';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { ModalSheet } from '../../src/ui/components/ModalSheet';
import { radii, spacing, typography } from '../../src/ui/tokens';
import { generateFactualInsights } from '../../src/domain/insights';
import { formatLocalDate } from '../../src/domain/dayCalculator';
import { Activity } from '../../src/domain/types';

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const {
    settings,
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
    splitUntrackedGap,
    recordWake,
    refresh,
  } = useApp();

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [undoGapInfo, setUndoGapInfo] = useState<{ gapStart: number; duration: number } | null>(null);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17) timeGreeting = 'Good evening';

    if (settings.profileName) {
      return `${timeGreeting}, ${settings.profileName}`;
    }
    return timeGreeting;
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const formatTimerDigits = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const sessionStatus = currentSession?.status ?? 'idle';
  const activeActivity = activities.find((a) => a.id === currentSession?.activityId) ?? selectedActivity;

  // Factual insights
  const insights = todayAccounting
    ? generateFactualInsights(todayAccounting, todayWakeMarker, todayPriorities)
    : [];

  // Recent untracked gap
  const recentGap = todayAccounting?.gaps && todayAccounting.gaps.length > 0
    ? todayAccounting.gaps[todayAccounting.gaps.length - 1]
    : null;

  const handleQuickLabelGap = async (act: Activity) => {
    if (!recentGap) return;
    try {
      await splitUntrackedGap(recentGap.startMs, recentGap.endMs, [
        { activityId: act.id, durationMs: recentGap.durationMs, reason: act.name },
      ]);
      setUndoGapInfo({ gapStart: recentGap.startMs, duration: recentGap.durationMs });
    } catch (err: any) {
      Alert.alert('Unable to label gap', err.message);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
      ]}
    >
      {/* Top Bar: Wordmark, Date, Settings & Inspection Preview */}
      <View style={styles.topBar}>
        <View>
          <Text style={[typography.metadata, { color: colors.primaryAction, letterSpacing: 2.5 }]}>
            V I G I L
          </Text>
          <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 2 }]}>
            {formattedDate.toUpperCase()}
          </Text>
        </View>

        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push('/preview')}
            style={[styles.topBtn, { backgroundColor: colors.surfaceRaised }]}
            accessibilityRole="button"
            accessibilityLabel="Gate D1 Preview Fixture"
          >
            <AppIcon name="sparkles" size={18} color={colors.primaryAction} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.topBtn, { backgroundColor: colors.surfaceRaised, marginLeft: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <AppIcon name="settings" size={18} color={colors.primaryText} />
          </Pressable>
        </View>
      </View>

      {/* Greeting Header */}
      <View style={styles.greetingHeader}>
        <Text style={[typography.greeting, { color: colors.primaryText }]}>
          {getGreeting()}
        </Text>
        <Text style={[typography.body, { color: colors.secondaryText, marginTop: 4 }]}>
          {sessionStatus === 'running'
            ? 'Stay present. One moment at a time.'
            : sessionStatus === 'paused'
            ? 'Taking a breath. Resume when you are ready.'
            : 'What would you like to spend time on?'}
        </Text>
      </View>

      {/* Priorities Compact Preview */}
      {todayPriorities.length > 0 && (
        <Card variant="subtle" padding={14} style={styles.priorityCard}>
          <View style={styles.priorityHeaderRow}>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>
              TODAY'S PRIORITIES
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/review')}>
              <Text style={[typography.metadata, { color: colors.secondaryText }]}>Edit</Text>
            </Pressable>
          </View>
          {todayPriorities.map((p) => (
            <View key={p.id} style={styles.priorityRow}>
              <AppIcon
                name={p.completedAt ? 'check' : 'time'}
                size={16}
                color={p.completedAt ? colors.primaryAction : colors.mutedText}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: p.completedAt ? colors.mutedText : colors.primaryText,
                    textDecorationLine: p.completedAt ? 'line-through' : 'none',
                    marginLeft: 8,
                    flex: 1,
                  },
                ]}
                numberOfLines={1}
              >
                {p.title}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Hero Timer Section with Mountain Landscape */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MountainLandscape height={310} />

        <View style={styles.timerCenter}>
          <TimerHalo
            status={sessionStatus}
            size={250}
            targetSeconds={currentSession?.targetSeconds ?? activeActivity?.targetSeconds}
            elapsedSeconds={liveElapsedSeconds}
          >
            <Text
              style={[
                typography.metadata,
                {
                  color: sessionStatus === 'paused' ? colors.amber : colors.primaryAction,
                  marginBottom: 4,
                },
              ]}
            >
              {sessionStatus === 'idle'
                ? 'READY'
                : sessionStatus === 'running'
                ? 'CURRENTLY ACTIVE'
                : `PAUSED (${Math.floor(livePauseSeconds / 60)}m)`}
            </Text>

            <Text
              style={[
                typography.timer,
                {
                  color: colors.primaryText,
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              {sessionStatus === 'idle' ? '00:00' : formatTimerDigits(liveElapsedSeconds)}
            </Text>

            {/* Activity Picker Trigger */}
            <Pressable
              onPress={() => setIsPickerVisible(true)}
              style={[
                styles.activityPickerBtn,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select activity, currently ${activeActivity?.name ?? 'None'}`}
            >
              <AppIcon
                name={activeActivity?.iconKey ?? 'laptop'}
                size={16}
                color={colors.primaryAction}
              />
              <Text style={[typography.bodyMedium, { color: colors.primaryText, marginHorizontal: 8 }]}>
                {activeActivity?.name ?? 'Select Activity'}
              </Text>
              <AppIcon name="add" size={14} color={colors.secondaryText} />
            </Pressable>
          </TimerHalo>
        </View>

        {/* Live Controls */}
        <View style={styles.heroControls}>
          {sessionStatus === 'idle' ? (
            <Button
              label={`Start ${activeActivity?.name ?? 'Session'}`}
              icon={<AppIcon name="play" size={22} color={colors.onPrimaryAction} />}
              onPress={() => {
                if (activeActivity) {
                  startSession(activeActivity.id, activeActivity.targetSeconds ?? undefined);
                } else {
                  setIsPickerVisible(true);
                }
              }}
              size="large"
            />
          ) : sessionStatus === 'running' ? (
            <View style={styles.buttonRow}>
              <Button
                label="Pause"
                variant="secondary"
                icon={<AppIcon name="pause" size={18} color={colors.primaryText} />}
                onPress={() => pauseSession()}
                style={{ flex: 1, marginRight: 12 }}
              />
              <Button
                label="Finish"
                variant="primary"
                icon={<AppIcon name="check" size={18} color={colors.onPrimaryAction} />}
                onPress={() => finishSession()}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Button
                label="Resume"
                variant="primary"
                icon={<AppIcon name="play" size={18} color={colors.onPrimaryAction} />}
                onPress={() => resumeSession()}
                style={{ flex: 1, marginRight: 12 }}
              />
              <Button
                label="Finish"
                variant="secondary"
                icon={<AppIcon name="check" size={18} color={colors.primaryText} />}
                onPress={() => finishSession()}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </View>

      {/* Untracked Gap Follow-up Card */}
      {recentGap && recentGap.durationMs >= 15 * 60 * 1000 && sessionStatus === 'idle' && (
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
                What were you doing? Quick label or split below:
              </Text>
            </View>
          </View>

          {/* Quick Tag Pills */}
          <View style={styles.pillsRow}>
            {activities.slice(0, 6).map((act) => (
              <Pressable
                key={act.id}
                onPress={() => handleQuickLabelGap(act)}
                style={[
                  styles.quickTagPill,
                  { backgroundColor: colors.surface, borderColor: colors.warmGapBorder },
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
          </View>
        </Card>
      )}

      {/* Wake / Sleep Quick Actions */}
      <View style={styles.wakeSleepRow}>
        {!todayWakeMarker && (
          <Button
            label="I'm Awake"
            variant="outline"
            size="small"
            icon={<AppIcon name="sun" size={16} color={colors.primaryAction} />}
            onPress={() => recordWake('Woke up')}
            style={{ flex: 1, marginRight: 8 }}
          />
        )}
        <Button
          label="Going to Sleep"
          variant="outline"
          size="small"
          icon={<AppIcon name="moon" size={16} color={colors.mountainMid} />}
          onPress={async () => {
            const sleepAct = activities.find((a) => a.name.toLowerCase() === 'sleep');
            if (sleepAct) {
              await startSession(sleepAct.id, 8 * 3600);
            }
          }}
          style={{ flex: 1 }}
        />
      </View>

      {/* Daily Factual Insight Card */}
      {insights.map((ins) => (
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
      ))}

      {/* Activity Picker Modal Sheet */}
      <ModalSheet
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        title="Select Activity"
      >
        <ScrollView style={{ maxHeight: 380 }}>
          {activities.map((act) => (
            <Pressable
              key={act.id}
              onPress={async () => {
                setSelectedActivity(act);
                setIsPickerVisible(false);
                if (sessionStatus === 'running' || sessionStatus === 'paused') {
                  await switchSession(act.id);
                }
              }}
              style={[
                styles.pickerRow,
                {
                  backgroundColor:
                    activeActivity?.id === act.id ? colors.surfaceRaised : 'transparent',
                },
              ]}
            >
              <View style={[styles.pickerIcon, { backgroundColor: colors.actionSubtle }]}>
                <AppIcon name={act.iconKey} size={18} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>
                  {act.name}
                </Text>
                {act.targetSeconds && (
                  <Text style={[typography.metadata, { color: colors.secondaryText }]}>
                    Target: {Math.round(act.targetSeconds / 60)} min
                  </Text>
                )}
              </View>
              {activeActivity?.id === act.id && (
                <AppIcon name="check" size={20} color={colors.primaryAction} />
              )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingHeader: {
    marginBottom: 20,
  },
  priorityCard: {
    marginBottom: 20,
  },
  priorityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  heroCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 24,
  },
  timerCenter: {
    marginTop: 28,
    marginBottom: 24,
    alignItems: 'center',
  },
  activityPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: 10,
  },
  heroControls: {
    paddingHorizontal: spacing.cardPadding,
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
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
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
});
