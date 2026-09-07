import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/ThemeContext';
import { MountainLandscape } from '../src/ui/MountainLandscape';
import { TimerHalo } from '../src/ui/TimerHalo';
import { Button } from '../src/ui/components/Button';
import { Card } from '../src/ui/components/Card';
import { AppIcon } from '../src/ui/components/AppIcon';
import { radii, spacing, typography } from '../src/ui/tokens';

export default function PreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setPreference } = useTheme();

  // Isolated fixture states
  const [previewState, setPreviewState] = useState<'idle' | 'running' | 'paused'>('running');
  const [elapsedSec, setElapsedSec] = useState(1500); // 25:00

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      {/* Top Controls Bar for Inspection */}
      <View style={styles.inspectionBar}>
        <Button
          label="Back"
          size="small"
          variant="ghost"
          icon={<AppIcon name="close" size={18} color={colors.secondaryText} />}
          onPress={() => router.back()}
        />
        <View style={styles.controlsGroup}>
          <Button
            label={mode === 'dark' ? '☀ Light' : '🌙 Dark'}
            size="small"
            variant="outline"
            onPress={() => setPreference(mode === 'dark' ? 'light' : 'dark')}
          />
        </View>
      </View>

      <Text style={[typography.metadata, { color: colors.secondaryText, marginBottom: 8 }]}>
        GATE D1 DESIGN CHECKPOINT — ISOLATED PREVIEW
      </Text>

      {/* State Switcher Tabs */}
      <View style={[styles.stateTabs, { backgroundColor: colors.surfaceRaised }]}>
        {(['idle', 'running', 'paused'] as const).map((st) => (
          <Pressable
            key={st}
            style={[
              styles.stateTab,
              previewState === st && { backgroundColor: colors.primaryAction },
            ]}
            onPress={() => setPreviewState(st)}
          >
            <Text
              style={[
                typography.metadata,
                {
                  color: previewState === st ? colors.onPrimaryAction : colors.secondaryText,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                },
              ]}
            >
              {st}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* App Header Preview */}
      <View style={styles.header}>
        <View>
          <Text style={[typography.metadata, { color: colors.secondaryText }]}>
            MONDAY, APR 14
          </Text>
          <Text style={[typography.greeting, { color: colors.primaryText }]}>
            Good afternoon,
          </Text>
          <Text style={[typography.body, { color: colors.secondaryText }]}>
            Be present. One moment at a time.
          </Text>
        </View>
        <View style={[styles.avatarCircle, { backgroundColor: colors.actionSubtle }]}>
          <AppIcon name="sun" size={20} color={colors.primaryAction} />
        </View>
      </View>

      {/* Hero Timer Section with Mountain Landscape */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MountainLandscape height={320} />

        <View style={styles.timerCenter}>
          <TimerHalo
            status={previewState}
            size={240}
            targetSeconds={previewState === 'running' ? 1800 : null}
            elapsedSeconds={previewState === 'running' ? 1500 : 0}
          >
            <Text style={[typography.metadata, { color: colors.primaryAction, marginBottom: 4 }]}>
              {previewState === 'idle'
                ? 'READY'
                : previewState === 'running'
                ? 'CURRENTLY FOCUSED'
                : 'PAUSED'}
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
              {previewState === 'idle' ? '00:00' : formatTimer(elapsedSec)}
            </Text>

            <View style={[styles.activityPill, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
              <AppIcon name="laptop" size={14} color={colors.primaryAction} />
              <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                Deep Work
              </Text>
            </View>
          </TimerHalo>
        </View>

        {/* Live Action Controls */}
        <View style={styles.heroControls}>
          {previewState === 'idle' ? (
            <Button
              label="Start Session"
              icon={<AppIcon name="play" size={20} color={colors.onPrimaryAction} />}
              onPress={() => setPreviewState('running')}
              size="large"
              style={{ flex: 1 }}
            />
          ) : previewState === 'running' ? (
            <View style={styles.buttonRow}>
              <Button
                label="Pause"
                variant="secondary"
                icon={<AppIcon name="pause" size={18} color={colors.primaryText} />}
                onPress={() => setPreviewState('paused')}
                style={{ flex: 1, marginRight: 12 }}
              />
              <Button
                label="Finish"
                variant="primary"
                icon={<AppIcon name="check" size={18} color={colors.onPrimaryAction} />}
                onPress={() => setPreviewState('idle')}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Button
                label="Resume"
                variant="primary"
                icon={<AppIcon name="play" size={18} color={colors.onPrimaryAction} />}
                onPress={() => setPreviewState('running')}
                style={{ flex: 1, marginRight: 12 }}
              />
              <Button
                label="Finish"
                variant="secondary"
                icon={<AppIcon name="check" size={18} color={colors.primaryText} />}
                onPress={() => setPreviewState('idle')}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </View>

      {/* Untracked Gap Card Preview */}
      <Card variant="warm" style={{ marginTop: 20 }}>
        <View style={styles.gapHeader}>
          <View style={[styles.gapIconCircle, { backgroundColor: colors.warmGapBorder }]}>
            <AppIcon name="hourglass" size={18} color={colors.warmGapText} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.sectionTitle, { color: colors.warmGapText, fontSize: 16 }]}>
              45m untracked
            </Text>
            <Text style={[typography.caption, { color: colors.warmGapText, opacity: 0.85 }]}>
              since 2:15 PM · What were you doing?
            </Text>
          </View>
        </View>

        {/* Quick Tag Pills */}
        <View style={styles.pillsContainer}>
          {['Rest', 'Errands', 'Reading', 'Social', 'Exercise', 'Other'].map((tag) => (
            <View
              key={tag}
              style={[
                styles.quickTag,
                { backgroundColor: colors.surface, borderColor: colors.warmGapBorder },
              ]}
            >
              <Text style={[typography.caption, { color: colors.primaryText, fontWeight: '500' }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Daily Factual Insight Card */}
      <Card variant="surface" style={{ marginTop: 16 }}>
        <View style={styles.insightRow}>
          <View style={[styles.insightIcon, { backgroundColor: colors.actionSubtle }]}>
            <AppIcon name="sparkles" size={20} color={colors.primaryAction} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.sectionTitle, { color: colors.primaryText, fontSize: 16 }]}>
              Daily Insight
            </Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginTop: 2 }]}>
              Your longest uninterrupted active session today was 38 minutes.
            </Text>
          </View>
        </View>
      </Card>
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
  inspectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  stateTabs: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 20,
  },
  stateTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 24,
  },
  timerCenter: {
    marginTop: 36,
    marginBottom: 24,
    alignItems: 'center',
  },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: 8,
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
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  quickTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
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
});
