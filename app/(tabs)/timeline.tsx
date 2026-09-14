import React, { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
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
import { ActiveSessionBar } from '../../src/ui/ActiveSessionBar';
import { radii, spacing, typography } from '../../src/ui/tokens';
import { computeDayAccounting, formatLocalDate } from '../../src/domain/dayCalculator';
import { formatDurationCompact } from '../../src/domain/insights';
import { Activity, ClippedInterval, UntrackedGap } from '../../src/domain/types';

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { repo, timeEngine, activities, categories, splitUntrackedGap, refresh, settings } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(formatLocalDate(new Date()));
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [dayAccounting, setDayAccounting] = useState<any | null>(null);

  // Interval detail / edit modal
  const [selectedInterval, setSelectedInterval] = useState<ClippedInterval | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editActivityId, setEditActivityId] = useState<string>('');
  const [editDurationMins, setEditDurationMins] = useState<string>('30');
  const [editReason, setEditReason] = useState<string>('');
  const [isEditingForm, setIsEditingForm] = useState(false);

  // Manual entry modal
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [manualActivityId, setManualActivityId] = useState<string>('');
  const [manualDurationMins, setManualDurationMins] = useState<string>('30');
  const [manualReason, setManualReason] = useState<string>('');
  const [selectedGapIndex, setSelectedGapIndex] = useState<number>(0);

  // Gap split modal
  const [splitGapTarget, setSplitGapTarget] = useState<UntrackedGap | null>(null);
  const [splitAct1, setSplitAct1] = useState<string>('');
  const [splitMins1, setSplitMins1] = useState<string>('20');
  const [splitAct2, setSplitAct2] = useState<string>('');
  const [splitMins2, setSplitMins2] = useState<string>('10');

  // Load accounting for selected date
  const loadTimelineData = async () => {
    if (!repo) return;
    const intervals = await repo.getIntervals();
    const sessions = await repo.getSessions();
    const acts = await repo.getActivities(true);
    const cats = await repo.getCategories();
    const accounting = computeDayAccounting(
      selectedDate,
      Date.now(),
      intervals,
      sessions,
      acts,
      cats,
      settings.trackingAwarenessStartedAtMs
    );
    setDayAccounting(accounting);
  };

  useEffect(() => {
    loadTimelineData();
  }, [selectedDate, repo, settings.trackingAwarenessStartedAtMs]);

  const formatTimeHM = (timestampMs: number) => {
    const d = new Date(timestampMs);
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (settings.timeFormat === '24h') {
      return `${hours}:${minutes}`;
    }
    const h12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${h12}:${minutes} ${ampm}`;
  };

  // Generate 7-day strip based on weekOffset
  const todayStr = formatLocalDate(new Date());
  const selectedIsFuture = selectedDate > todayStr;
  const dateStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7 - 3 + i);
    const dateStr = formatLocalDate(d);
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(d);
    const dayNum = d.getDate();
    return { dateStr, dayName, dayNum };
  });

  const handleOpenDetailModal = (inv: ClippedInterval) => {
    setSelectedInterval(inv);
    setEditActivityId(inv.activityId ?? (activities[0]?.id ?? ''));
    setEditDurationMins(String(Math.round(inv.durationMs / 60000)));
    setEditReason(inv.reason ?? '');
    setIsEditingForm(false);
    setIsEditModalVisible(true);
  };

  const handleSaveEditInterval = async () => {
    if (!selectedInterval || !timeEngine) return;
    const mins = parseInt(editDurationMins, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid duration', 'Please enter a duration greater than 0 minutes.');
      return;
    }

    try {
      const newEndMs = selectedInterval.startMs + mins * 60000;
      await timeEngine.editInterval(
        selectedInterval.id,
        selectedInterval.startMs,
        newEndMs,
        editActivityId || undefined,
        editReason.trim() || undefined
      );
      setIsEditModalVisible(false);
      setSelectedInterval(null);
      await refresh();
      await loadTimelineData();
      Alert.alert('Interval updated', 'The entry has been successfully updated.');
    } catch (err: any) {
      Alert.alert('Collision or error', err.message);
    }
  };

  const handleDeleteInterval = async () => {
    if (!selectedInterval || !timeEngine) return;
    try {
      await timeEngine.deleteInterval(selectedInterval.id);
      setIsEditModalVisible(false);
      setSelectedInterval(null);
      await refresh();
      await loadTimelineData();
    } catch (err: any) {
      Alert.alert('Delete failed', err.message);
    }
  };

  const handleAddManualEntry = async () => {
    if (!timeEngine) return;
    const actId = manualActivityId || activities[0]?.id;
    if (!actId) {
      Alert.alert('Activity required', 'Please choose an activity for this manual entry.');
      return;
    }
    const mins = parseInt(manualDurationMins, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid duration', 'Please enter a valid duration in minutes.');
      return;
    }

    if (!dayAccounting?.gaps || dayAccounting.gaps.length === 0) {
      Alert.alert('No untracked window', 'All time on this date is already accounted for. Tap any interval to edit or delete.');
      return;
    }

    const availableGaps = dayAccounting.gaps as UntrackedGap[];
    const chosenGap = availableGaps[selectedGapIndex] ?? availableGaps[availableGaps.length - 1];

    const durationMs = mins * 60 * 1000;
    if (durationMs > chosenGap.durationMs) {
      Alert.alert(
        'Duration exceeds gap',
        `The chosen duration (${mins}m) exceeds the available untracked window (${Math.round(chosenGap.durationMs / 60000)}m).`
      );
      return;
    }

    try {
      const targetStartMs = chosenGap.startMs;
      const targetEndMs = Math.min(chosenGap.endMs, chosenGap.startMs + durationMs);

      await splitUntrackedGap(targetStartMs, targetEndMs, [
        { activityId: actId, durationMs: targetEndMs - targetStartMs, reason: manualReason.trim() || undefined },
      ]);
      setIsAddModalVisible(false);
      setManualReason('');
      await refresh();
      await loadTimelineData();
      Alert.alert('Entry added', 'Manual entry has been recorded in your timeline.');
    } catch (err: any) {
      Alert.alert('Collision or error', err.message);
    }
  };

  const handleConfirmSplitGap = async () => {
    if (!splitGapTarget) return;
    const a1 = splitAct1 || activities[0]?.id;
    const a2 = splitAct2 || (activities.length > 1 ? activities[1]?.id : activities[0]?.id);

    if (!a1) {
      Alert.alert('Please select an activity', 'An activity selection is required for the first segment.');
      return;
    }

    const m1 = parseInt(splitMins1, 10);
    const m2 = parseInt(splitMins2, 10);

    const safeM1 = !isNaN(m1) && m1 > 0 ? m1 : 0;
    const safeM2 = !isNaN(m2) && m2 > 0 ? m2 : 0;

    if ((!isNaN(m1) && m1 < 0) || (!isNaN(m2) && m2 < 0)) {
      Alert.alert('Invalid duration', 'Durations cannot be negative numbers.');
      return;
    }

    if (safeM1 === 0 && safeM2 === 0) {
      Alert.alert('Duration required', 'Please allocate at least 1 minute to an activity.');
      return;
    }

    const totalMs = (safeM1 + safeM2) * 60 * 1000;
    if (totalMs > splitGapTarget.durationMs) {
      Alert.alert(
        'Duration exceeds gap',
        `Total requested (${safeM1 + safeM2}m) exceeds the gap length (${Math.round(splitGapTarget.durationMs / 60000)}m).`
      );
      return;
    }

    const segments: Array<{ activityId: string; durationMs: number; reason?: string }> = [];
    if (safeM1 > 0 && a1) {
      segments.push({ activityId: a1, durationMs: safeM1 * 60 * 1000 });
    }
    if (safeM2 > 0 && a2) {
      segments.push({ activityId: a2, durationMs: safeM2 * 60 * 1000 });
    }

    try {
      await splitUntrackedGap(splitGapTarget.startMs, splitGapTarget.endMs, segments);
      setSplitGapTarget(null);
      await refresh();
      await loadTimelineData();
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

          <View style={styles.headerActions}>
            {selectedDate !== todayStr && (
              <Button
                label="Today"
                size="small"
                variant="outline"
                onPress={() => {
                  setWeekOffset(0);
                  setSelectedDate(todayStr);
                }}
                style={{ marginRight: 8 }}
              />
            )}
            <Button
              label="+ Entry"
              size="small"
              variant="primary"
              disabled={selectedIsFuture}
              icon={<AppIcon name="add" size={16} color={colors.onPrimaryAction} />}
              onPress={() => {
                setManualActivityId(activities[0]?.id ?? '');
                setManualDurationMins('30');
                setManualReason('');
                setSelectedGapIndex(0);
                setIsAddModalVisible(true);
              }}
            />
          </View>
        </View>

        <ActiveSessionBar />

        {/* 7-Day Horizontal Date Strip with Navigation Chevrons */}
        <View style={styles.dateStripWrapper}>
          <Pressable
            onPress={() => setWeekOffset((prev) => prev - 1)}
            style={[styles.dateNavBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            accessibilityRole="button"
            accessibilityLabel="Previous 7 days"
          >
            <AppIcon name="chevron-back" size={16} color={colors.primaryText} />
          </Pressable>

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

          <Pressable
            onPress={() => setWeekOffset((prev) => prev + 1)}
            style={[styles.dateNavBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            accessibilityRole="button"
            accessibilityLabel="Next 7 days"
          >
            <AppIcon name="chevron-forward" size={16} color={colors.primaryText} />
          </Pressable>
        </View>

        {/* Daily Accounting Balance Chips (Honest Labels respecting PRODUCT.md 24-25) */}
        {dayAccounting && (
          <View style={styles.balanceChipsRow}>
            <View style={[styles.balanceChip, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.primaryAction }]} />
              <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                {formatDurationCompact(dayAccounting.accountedActiveMs)} Active
              </Text>
            </View>

            {dayAccounting.accountedSleepMs > 0 && (
              <View style={[styles.balanceChip, { backgroundColor: colors.surfaceRaised }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.mountainFar }]} />
                <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                  {formatDurationCompact(dayAccounting.accountedSleepMs)} Sleep
                </Text>
              </View>
            )}

            <View style={[styles.balanceChip, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.amber }]} />
              <Text style={[typography.metadata, { color: colors.primaryText, marginLeft: 6 }]}>
                {formatDurationCompact(dayAccounting.accountedPauseMs)} Pauses
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
                onPress={() => handleOpenDetailModal(inv)}
                style={styles.intervalCardWrapper}
                accessibilityRole="button"
                accessibilityLabel={`Interval ${inv.activityName ?? inv.kind}, ${formatTimeHM(inv.startMs)} to ${formatTimeHM(inv.endMs)}`}
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

                    <AppIcon name="chevron-forward" size={16} color={colors.mutedText} />
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
                    setSplitAct1(activities[0]?.id ?? '');
                    setSplitAct2(activities.length > 1 ? activities[1]?.id : activities[0]?.id ?? '');
                    const totalM = Math.round(gap.durationMs / 60000);
                    const m1 = Math.round(totalM * 0.6);
                    const m2 = totalM - m1;
                    setSplitMins1(String(m1));
                    setSplitMins2(String(m2));
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button for Android Quick Entry */}
      {!selectedIsFuture ? <Pressable
        onPress={() => {
          setManualActivityId(activities[0]?.id ?? '');
          setManualDurationMins('30');
          setManualReason('');
          setIsAddModalVisible(true);
        }}
        style={[styles.fab, { backgroundColor: colors.primaryAction }]}
        accessibilityRole="button"
        accessibilityLabel="Add manual time entry"
      >
        <AppIcon name="add" size={24} color={colors.onPrimaryAction} />
      </Pressable> : null}

      {/* Detail / Edit / Delete Interval Sheet */}
      <ModalSheet
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        title={isEditingForm ? 'Edit Interval' : 'Interval Details'}
      >
        {selectedInterval && (
          <View>
            {!isEditingForm ? (
              <>
                <Text style={[typography.title, { color: colors.primaryText, marginBottom: 4 }]}>
                  {selectedInterval.activityName ?? selectedInterval.kind}
                </Text>
                <Text style={[typography.body, { color: colors.secondaryText, marginBottom: 12 }]}>
                  {formatTimeHM(selectedInterval.startMs)} to {formatTimeHM(selectedInterval.endMs)} (
                  {formatDurationCompact(selectedInterval.durationMs)})
                </Text>

                {selectedInterval.reason && (
                  <Text style={[typography.caption, { color: colors.secondaryText, marginBottom: 16 }]}>
                    Reason: {selectedInterval.reason}
                  </Text>
                )}

                {selectedInterval.isOpen ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[typography.bodyMedium, { color: colors.amber, fontWeight: '600' }]}>
                      Currently Active Session
                    </Text>
                    <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 4 }]}>
                      This session is currently recording live. Manage or finish it on the Today screen.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonRowModal}>
                    <Button
                      label="Edit Entry"
                      variant="primary"
                      icon={<AppIcon name="settings" size={16} color={colors.onPrimaryAction} />}
                      onPress={() => setIsEditingForm(true)}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                      label="Delete"
                      variant="danger"
                      icon={<AppIcon name="close" size={16} color="#FFF" />}
                      onPress={handleDeleteInterval}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={[typography.caption, { color: colors.secondaryText, marginBottom: 12 }]}>
                  Change activity, duration, or note for this record.
                </Text>

                <Text style={[typography.metadata, { color: colors.secondaryText, marginBottom: 6 }]}>
                  ACTIVITY
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {activities.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => setEditActivityId(a.id)}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: editActivityId === a.id ? colors.primaryAction : colors.surfaceRaised,
                          borderColor: editActivityId === a.id ? colors.primaryAction : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: editActivityId === a.id ? colors.onPrimaryAction : colors.primaryText,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {a.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Input
                  label="Duration (minutes)"
                  value={editDurationMins}
                  onChangeText={setEditDurationMins}
                  keyboardType="number-pad"
                />

                <Input
                  label="Note / Reason (optional)"
                  value={editReason}
                  onChangeText={setEditReason}
                  placeholder="e.g. Deep focus, Client sync"
                />

                <View style={styles.buttonRowModal}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setIsEditingForm(false)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    label="Save Changes"
                    variant="primary"
                    onPress={handleSaveEditInterval}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </ModalSheet>

      {/* Manual Entry Sheet */}
      <ModalSheet
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        title="Add Manual Entry"
      >
        {!dayAccounting?.gaps || dayAccounting.gaps.length === 0 ? (
          <View style={{ paddingVertical: 16 }}>
            <Text style={[typography.bodyMedium, { color: colors.primaryText, fontWeight: '600' }]}>
              All time accounted for
            </Text>
            <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 6 }]}>
              Every minute on this day is already recorded. To adjust existing records, tap an interval in the timeline stream to edit or delete it.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[typography.metadata, { color: colors.secondaryText, marginBottom: 6 }]}>
              CHOOSE UNTRACKED WINDOW
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {dayAccounting.gaps.map((gap: UntrackedGap, idx: number) => {
                const isSelected = selectedGapIndex === idx;
                return (
                  <Pressable
                    key={gap.id}
                    onPress={() => {
                      setSelectedGapIndex(idx);
                      const maxM = Math.round(gap.durationMs / 60000);
                      setManualDurationMins(String(Math.min(30, maxM)));
                    }}
                    style={[
                      styles.selectChip,
                      {
                        backgroundColor: isSelected ? colors.primaryAction : colors.surfaceRaised,
                        borderColor: isSelected ? colors.primaryAction : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? colors.onPrimaryAction : colors.primaryText,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {formatTimeHM(gap.startMs)} – {formatTimeHM(gap.endMs)} ({formatDurationCompact(gap.durationMs)})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[typography.metadata, { color: colors.secondaryText, marginBottom: 6, marginTop: 12 }]}>
              SELECT ACTIVITY
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {activities.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => setManualActivityId(a.id)}
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor: manualActivityId === a.id ? colors.primaryAction : colors.surfaceRaised,
                      borderColor: manualActivityId === a.id ? colors.primaryAction : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: manualActivityId === a.id ? colors.onPrimaryAction : colors.primaryText,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {a.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Input
              label="Duration (minutes)"
              value={manualDurationMins}
              onChangeText={setManualDurationMins}
              keyboardType="number-pad"
            />

            <Input
              label="Note / Reason (optional)"
              value={manualReason}
              onChangeText={setManualReason}
              placeholder="e.g. Offline study, workout"
            />

            <Button
              label="Add to Timeline"
              size="large"
              onPress={handleAddManualEntry}
              style={{ marginTop: 12 }}
            />
          </>
        )}
      </ModalSheet>

      {/* Split Gap Sheet with Real Activity Pickers */}
      <ModalSheet
        visible={splitGapTarget != null}
        onClose={() => setSplitGapTarget(null)}
        title="Split Untracked Gap"
      >
        {splitGapTarget && (
          <View>
            <Text style={[typography.body, { color: colors.secondaryText, marginBottom: 14 }]}>
              Total gap duration: {formatDurationCompact(splitGapTarget.durationMs)}. Allocate
              two activities below:
            </Text>

            {/* Activity 1 selector */}
            <Text style={[typography.metadata, { color: colors.secondaryText, marginBottom: 6 }]}>
              FIRST ACTIVITY
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {activities.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => setSplitAct1(a.id)}
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor: splitAct1 === a.id ? colors.primaryAction : colors.surfaceRaised,
                      borderColor: splitAct1 === a.id ? colors.primaryAction : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: splitAct1 === a.id ? colors.onPrimaryAction : colors.primaryText,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {a.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Input
              label="Activity 1 Duration (mins)"
              value={splitMins1}
              onChangeText={setSplitMins1}
              keyboardType="number-pad"
            />

            {/* Activity 2 selector */}
            <Text style={[typography.metadata, { color: colors.secondaryText, marginTop: 10, marginBottom: 6 }]}>
              SECOND ACTIVITY
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {activities.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => setSplitAct2(a.id)}
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor: splitAct2 === a.id ? colors.primaryAction : colors.surfaceRaised,
                      borderColor: splitAct2 === a.id ? colors.primaryAction : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: splitAct2 === a.id ? colors.onPrimaryAction : colors.primaryText,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {a.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
              style={{ marginTop: 16 }}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateStripWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateNavBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateStrip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 6,
  },
  dateStripItem: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 10,
    minHeight: 64,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  balanceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 6px rgba(0,0,0,0.30)' }
      : {
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        }),
    zIndex: 10,
  },
  buttonRowModal: {
    flexDirection: 'row',
    marginTop: 16,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: 8,
  },
});
