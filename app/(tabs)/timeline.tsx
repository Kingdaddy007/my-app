import React, { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/ThemeContext';
import { useApp } from '../../src/data/AppContext';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { Input } from '../../src/ui/components/Input';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { ModalSheet } from '../../src/ui/components/ModalSheet';
import { radii, spacing, typography } from '../../src/ui/tokens';
import { computeDayAccounting, formatLocalDate } from '../../src/domain/dayCalculator';
import { formatDurationCompact } from '../../src/domain/insights';
import { ClippedInterval, UntrackedGap } from '../../src/domain/types';

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { repo, timeEngine, activities, categories, splitUntrackedGap, refresh } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(formatLocalDate(new Date()));
  const [dayAccounting, setDayAccounting] = useState<any | null>(null);

  // Interval detail / edit modal
  const [selectedInterval, setSelectedInterval] = useState<ClippedInterval | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Manual entry modal
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [manualActivityId, setManualActivityId] = useState<string>('');
  const [manualDurationMins, setManualDurationMins] = useState<string>('30');
  const [manualReason, setManualReason] = useState<string>('');

  // Gap split modal
  const [splitGapTarget, setSplitGapTarget] = useState<UntrackedGap | null>(null);
  const [splitAct1, setSplitAct1] = useState<string>('');
  const [splitMins1, setSplitMins1] = useState<string>('20');
  const [splitAct2, setSplitAct2] = useState<string>('');
  const [splitMins2, setSplitMins2] = useState<string>('10');

  // Load accounting for selected date
  useEffect(() => {
    let isMounted = true;
    const fetchTimeline = async () => {
      if (!repo) return;
      const intervals = await repo.getIntervals();
      const sessions = await repo.getSessions();
      const acts = await repo.getActivities(true);
      const cats = await repo.getCategories();
      const accounting = computeDayAccounting(selectedDate, Date.now(), intervals, sessions, acts, cats);
      if (isMounted) {
        setDayAccounting(accounting);
      }
    };
    fetchTimeline();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, repo]);

  const formatTimeHM = (timestampMs: number) => {
    const d = new Date(timestampMs);
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Generate 7-day strip around today
  const todayStr = formatLocalDate(new Date());
  const dateStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    const dateStr = formatLocalDate(d);
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(d);
    const dayNum = d.getDate();
    return { dateStr, dayName, dayNum };
  });

  const handleDeleteInterval = async () => {
    if (!selectedInterval || !timeEngine) return;
    try {
      await timeEngine.deleteInterval(selectedInterval.id);
      setIsEditModalVisible(false);
      setSelectedInterval(null);
      await refresh();
      // Reload timeline
      if (repo) {
        const intervals = await repo.getIntervals();
        const sessions = await repo.getSessions();
        const acts = await repo.getActivities(true);
        const cats = await repo.getCategories();
        setDayAccounting(computeDayAccounting(selectedDate, Date.now(), intervals, sessions, acts, cats));
      }
    } catch (err: any) {
      Alert.alert('Delete failed', err.message);
    }
  };

  const handleAddManualEntry = async () => {
    if (!timeEngine || !manualActivityId) {
      Alert.alert('Please choose an activity');
      return;
    }
    const mins = parseInt(manualDurationMins, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Please enter a valid duration in minutes');
      return;
    }

    try {
      // Find latest gap or put at recent time
      const now = Date.now();
      const startMs = now - mins * 60 * 1000;
      await timeEngine.editInterval(
        // we can use splitGap or insert manual interval
        'new',
        startMs,
        now,
        manualActivityId,
        manualReason || undefined
      );
    } catch {
      // splitGap directly:
      const now = Date.now();
      const startMs = now - mins * 60 * 1000;
      try {
        await splitUntrackedGap(startMs, now, [
          { activityId: manualActivityId, durationMs: mins * 60 * 1000, reason: manualReason },
        ]);
        setIsAddModalVisible(false);
        await refresh();
      } catch (err: any) {
        Alert.alert('Entry collision', err.message);
      }
    }
  };

  const handleConfirmSplitGap = async () => {
    if (!splitGapTarget || !splitAct1) {
      Alert.alert('Please select at least one activity');
      return;
    }
    const m1 = parseInt(splitMins1, 10) || 0;
    const m2 = parseInt(splitMins2, 10) || 0;

    const segments: Array<{ activityId: string; durationMs: number; reason?: string }> = [];
    if (m1 > 0 && splitAct1) {
      segments.push({ activityId: splitAct1, durationMs: m1 * 60 * 1000 });
    }
    if (m2 > 0 && splitAct2) {
      segments.push({ activityId: splitAct2, durationMs: m2 * 60 * 1000 });
    }

    try {
      await splitUntrackedGap(splitGapTarget.startMs, splitGapTarget.endMs, segments);
      setSplitGapTarget(null);
      await refresh();
    } catch (err: any) {
      Alert.alert('Cannot split gap', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[typography.title, { color: colors.primaryText }]}>Day Timeline</Text>
            <Text style={[typography.metadata, { color: colors.secondaryText }]}>
              {selectedDate === todayStr ? 'Today' : selectedDate}
            </Text>
          </View>

          {selectedDate !== todayStr && (
            <Button
              label="Today"
              size="small"
              variant="outline"
              onPress={() => setSelectedDate(todayStr)}
            />
          )}
        </View>

        {/* 7-Day Horizontal Date Strip */}
        <View style={styles.dateStrip}>
          {dateStrip.map((item) => {
            const isSelected = item.dateStr === selectedDate;
            return (
              <Pressable
                key={item.dateStr}
                onPress={() => setSelectedDate(item.dateStr)}
                style={[
                  styles.dateStripItem,
                  {
                    backgroundColor: isSelected ? colors.primaryAction : colors.surface,
                    borderColor: isSelected ? colors.primaryAction : colors.borderSubtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Date ${item.dateStr}`}
              >
                <Text
                  style={[
                    typography.metadata,
                    {
                      color: isSelected ? colors.onPrimaryAction : colors.secondaryText,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {item.dayName}
                </Text>
                <Text
                  style={[
                    typography.sectionTitle,
                    {
                      color: isSelected ? colors.onPrimaryAction : colors.primaryText,
                      fontWeight: '700',
                      marginTop: 2,
                    },
                  ]}
                >
                  {item.dayNum}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Daily Accounting Balance Chips (from Mockups 1, 2, 3) */}
        {dayAccounting && (
          <View style={styles.balanceChipsRow}>
            <View style={[styles.balanceChip, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.primaryAction }]} />
              <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                {formatDurationCompact(dayAccounting.accountedActiveMs)} Active
              </Text>
            </View>

            <View style={[styles.balanceChip, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.amber }]} />
              <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                {formatDurationCompact(dayAccounting.accountedPauseMs)} Rest
              </Text>
            </View>

            <View style={[styles.balanceChip, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.mountainMid }]} />
              <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                {formatDurationCompact(dayAccounting.untrackedMs)} Untracked
              </Text>
            </View>
          </View>
        )}

        {/* Stream of Intervals & Gaps */}
        <View style={styles.timelineStream}>
          {dayAccounting?.intervals.length === 0 && dayAccounting?.gaps.length === 0 ? (
            <Card variant="surface" style={{ marginTop: 24, alignItems: 'center' }}>
              <AppIcon name="time" size={32} color={colors.secondaryText} />
              <Text style={[typography.sectionTitle, { color: colors.primaryText, marginTop: 12 }]}>
                No activities recorded
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.secondaryText, textAlign: 'center', marginTop: 4 },
                ]}
              >
                No tracked sessions or manual entries on this day yet.
              </Text>
            </Card>
          ) : (
            dayAccounting?.intervals.map((inv: ClippedInterval) => (
              <Pressable
                key={inv.id}
                onPress={() => {
                  setSelectedInterval(inv);
                  setIsEditModalVisible(true);
                }}
                style={styles.intervalCardWrapper}
              >
                <Card
                  variant="surface"
                  padding={14}
                  style={[
                    styles.intervalCard,
                    { borderLeftColor: inv.categoryColor ?? colors.primaryAction, borderLeftWidth: 4 },
                  ]}
                >
                  <View style={styles.intervalRow}>
                    <View style={[styles.intervalIcon, { backgroundColor: colors.actionSubtle }]}>
                      <AppIcon
                        name={inv.kind === 'sleep' ? 'moon' : inv.kind === 'pause' ? 'pause' : 'laptop'}
                        size={18}
                        color={inv.categoryColor ?? colors.primaryAction}
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[typography.bodyMedium, { color: colors.primaryText, fontWeight: '600' }]}>
                        {inv.activityName ?? (inv.kind === 'pause' ? `Pause: ${inv.reason ?? 'Break'}` : 'Activity')}
                      </Text>
                      <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 2 }]}>
                        {formatTimeHM(inv.startMs)} – {formatTimeHM(inv.endMs)} · {formatDurationCompact(inv.durationMs)}
                      </Text>
                    </View>

                    <AppIcon name="settings" size={16} color={colors.mutedText} />
                  </View>
                </Card>
              </Pressable>
            ))
          )}

          {/* Gaps in Timeline */}
          {dayAccounting?.gaps.map((gap: UntrackedGap) => (
            <Card
              key={gap.id}
              variant="warm"
              padding={12}
              style={{ marginTop: 8, marginBottom: 8 }}
            >
              <View style={styles.gapRow}>
                <View style={[styles.gapIconSmall, { backgroundColor: colors.warmGapBorder }]}>
                  <AppIcon name="hourglass" size={14} color={colors.warmGapText} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[typography.metadata, { color: colors.warmGapText, fontWeight: '700' }]}>
                    {formatDurationCompact(gap.durationMs)} UNTRACKED
                  </Text>
                  <Text style={[typography.caption, { color: colors.warmGapText, opacity: 0.85 }]}>
                    {formatTimeHM(gap.startMs)} – {formatTimeHM(gap.endMs)}
                  </Text>
                </View>
                <Button
                  label="Split / Label"
                  size="small"
                  variant="outline"
                  onPress={() => {
                    setSplitGapTarget(gap);
                    if (activities.length > 0) setSplitAct1(activities[0].id);
                    if (activities.length > 1) setSplitAct2(activities[1].id);
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Detail / Edit / Delete Interval Sheet */}
      <ModalSheet
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        title="Interval Details"
      >
        {selectedInterval && (
          <View>
            <Text style={[typography.title, { color: colors.primaryText, marginBottom: 4 }]}>
              {selectedInterval.activityName ?? selectedInterval.kind}
            </Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginBottom: 16 }]}>
              {formatTimeHM(selectedInterval.startMs)} to {formatTimeHM(selectedInterval.endMs)} (
              {formatDurationCompact(selectedInterval.durationMs)})
            </Text>

            {selectedInterval.reason && (
              <Text style={[typography.caption, { color: colors.secondaryText, marginBottom: 16 }]}>
                Reason: {selectedInterval.reason}
              </Text>
            )}

            <Button
              label="Delete Entry"
              variant="danger"
              icon={<AppIcon name="close" size={18} color="#FFF" />}
              onPress={handleDeleteInterval}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ModalSheet>

      {/* Split Gap Sheet */}
      <ModalSheet
        visible={splitGapTarget != null}
        onClose={() => setSplitGapTarget(null)}
        title="Split Untracked Gap"
      >
        {splitGapTarget && (
          <View>
            <Text style={[typography.body, { color: colors.secondaryText, marginBottom: 16 }]}>
              Total gap duration: {formatDurationCompact(splitGapTarget.durationMs)}. Allocate
              activities below:
            </Text>

            <Input
              label="Activity 1 Duration (mins)"
              value={splitMins1}
              onChangeText={setSplitMins1}
              keyboardType="number-pad"
            />

            <Input
              label="Activity 2 Duration (mins)"
              value={splitMins2}
              onChangeText={setSplitMins2}
              keyboardType="number-pad"
            />

            <Button
              label="Confirm Split"
              size="large"
              onPress={handleConfirmSplitGap}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.pageGutter,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateStripItem: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: radii.control,
    alignItems: 'center',
    borderWidth: 1,
  },
  balanceChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  balanceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineStream: {
    gap: 12,
  },
  intervalCardWrapper: {
    marginBottom: 8,
  },
  intervalCard: {
    borderRadius: radii.control,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gapIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
