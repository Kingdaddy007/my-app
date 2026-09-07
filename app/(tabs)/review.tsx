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
import { MountainLandscape } from '../../src/ui/MountainLandscape';
import { DonutChart } from '../../src/ui/DonutChart';
import { WeeklyTrendChart } from '../../src/ui/WeeklyTrendChart';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { Input } from '../../src/ui/components/Input';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { ModalSheet } from '../../src/ui/components/ModalSheet';
import { radii, spacing, typography } from '../../src/ui/tokens';
import { formatDurationCompact } from '../../src/domain/insights';
import { formatLocalDate } from '../../src/domain/dayCalculator';
import { Priority } from '../../src/domain/types';

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { repo, todayAccounting, refresh } = useApp();

  const [reviewRange, setReviewRange] = useState<'day' | 'week'>('day');
  const [tomorrowPriorities, setTomorrowPriorities] = useState<Priority[]>([]);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [priorityTitleInput, setPriorityTitleInput] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);

  // Compute tomorrow's date string
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = formatLocalDate(tomorrow);

  const loadTomorrowPriorities = async () => {
    if (!repo) return;
    const list = await repo.getPrioritiesForDate(tomorrowDateStr);
    setTomorrowPriorities(list);
  };

  useEffect(() => {
    loadTomorrowPriorities();
  }, [repo]);

  // Donut chart segments from today's real accounting
  const donutSegments = todayAccounting
    ? [
        {
          label: 'Focused',
          value: todayAccounting.accountedActiveMs,
          color: colors.primaryAction,
        },
        {
          label: 'Rest & Pauses',
          value: todayAccounting.accountedPauseMs + todayAccounting.accountedSleepMs,
          color: colors.amber,
        },
        {
          label: 'Untracked',
          value: todayAccounting.untrackedMs,
          color: colors.mountainMid,
        },
      ]
    : [];

  // Mock weekly trend data populated from recent dates
  const weekDays = [
    { dayLabel: 'M', activeMs: 5.5 * 3600 * 1000 },
    { dayLabel: 'T', activeMs: 6.2 * 3600 * 1000 },
    { dayLabel: 'W', activeMs: 4.8 * 3600 * 1000 },
    { dayLabel: 'T', activeMs: 7.0 * 3600 * 1000 },
    { dayLabel: 'F', activeMs: 6.5 * 3600 * 1000 },
    { dayLabel: 'S', activeMs: 3.2 * 3600 * 1000 },
    { dayLabel: 'S', activeMs: todayAccounting?.accountedActiveMs ?? 0, isToday: true },
  ];

  const handleTogglePriority = async (p: Priority) => {
    if (!repo) return;
    p.completedAt = p.completedAt ? null : Date.now();
    await repo.savePriority(p);
    await loadTomorrowPriorities();
  };

  const handleAddOrEditPriority = async () => {
    if (!repo || !priorityTitleInput.trim()) return;

    if (editingPriority) {
      editingPriority.title = priorityTitleInput.trim();
      await repo.savePriority(editingPriority);
    } else {
      if (tomorrowPriorities.length >= 3) {
        Alert.alert('Maximum reached', 'VIGIL keeps tomorrow focused with exactly 3 priorities.');
        return;
      }
      const newP: Priority = {
        id: `p-${Date.now()}`,
        targetDate: tomorrowDateStr,
        title: priorityTitleInput.trim(),
        order: tomorrowPriorities.length,
        completedAt: null,
        createdAt: Date.now(),
      };
      await repo.savePriority(newP);
    }

    setEditingPriority(null);
    setPriorityTitleInput('');
    await loadTomorrowPriorities();
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (!repo) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= tomorrowPriorities.length) return;

    const list = [...tomorrowPriorities];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Save new orders
    list[index].order = index;
    list[targetIdx].order = targetIdx;
    await repo.savePriority(list[index]);
    await repo.savePriority(list[targetIdx]);
    await loadTomorrowPriorities();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
      ]}
    >
      {/* Header with Mountain Landscape Horizon */}
      <View style={[styles.horizonHeader, { borderColor: colors.border }]}>
        <MountainLandscape height={180} />
        <View style={styles.headerTextOverlay}>
          <Text style={[typography.metadata, { color: colors.primaryAction, letterSpacing: 2 }]}>
            EVENING REVIEW & PLAN
          </Text>
          <Text style={[typography.greeting, { color: colors.primaryText, marginTop: 4 }]}>
            Progress over perfection.
          </Text>
        </View>
      </View>

      {/* Day / Week Range Switcher */}
      <View style={[styles.rangeTabs, { backgroundColor: colors.surfaceRaised }]}>
        {(['day', 'week'] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setReviewRange(r)}
            style={[
              styles.rangeTab,
              reviewRange === r && { backgroundColor: colors.primaryAction },
            ]}
          >
            <Text
              style={[
                typography.metadata,
                {
                  color: reviewRange === r ? colors.onPrimaryAction : colors.secondaryText,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                },
              ]}
            >
              {r === 'day' ? 'Today' : 'This Week'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Donut Chart: Balance of the Day */}
      <Card variant="surface" style={styles.chartCard}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 16 }]}>
          Today's Balance
        </Text>

        <DonutChart
          segments={donutSegments}
          size={210}
          centerPrimaryText={formatDurationCompact(todayAccounting?.accountedActiveMs ?? 0)}
          centerSecondaryText="Focused Time"
        />

        {/* Breakdown List */}
        <View style={styles.legendContainer}>
          {donutSegments.map((seg) => (
            <View key={seg.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={[typography.bodyMedium, { color: colors.primaryText, flex: 1, marginLeft: 10 }]}>
                {seg.label}
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.secondaryText, fontWeight: '600' }]}>
                {formatDurationCompact(seg.value)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Transparent Arithmetic Insights */}
      {todayAccounting && (
        <View style={styles.metricsRow}>
          <Card variant="surface" style={{ flex: 1, marginRight: 8 }}>
            <Text style={[typography.metadata, { color: colors.secondaryText }]}>
              LONGEST INTERVAL
            </Text>
            <Text style={[typography.title, { color: colors.primaryAction, marginTop: 4 }]}>
              {formatDurationCompact(todayAccounting.longestUninterruptedMs)}
            </Text>
          </Card>

          <Card variant="surface" style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[typography.metadata, { color: colors.secondaryText }]}>
              RECORDED PAUSES
            </Text>
            <Text style={[typography.title, { color: colors.amber, marginTop: 4 }]}>
              {todayAccounting.interruptionCount} ({formatDurationCompact(todayAccounting.accountedPauseMs)})
            </Text>
          </Card>
        </View>
      )}

      {/* Weekly Trend Bar Chart */}
      <Card variant="surface" style={{ marginTop: 16 }}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 8 }]}>
          Weekly Trend
        </Text>
        <WeeklyTrendChart days={weekDays} />
      </Card>

      {/* Tomorrow's 3 Priorities */}
      <Card variant="surface" style={{ marginTop: 20 }}>
        <View style={styles.prioritiesHeader}>
          <View>
            <Text style={[typography.sectionTitle, { color: colors.primaryText }]}>
              Tomorrow's 3 Priorities
            </Text>
            <Text style={[typography.caption, { color: colors.secondaryText }]}>
              A focused tomorrow starts tonight.
            </Text>
          </View>
          {tomorrowPriorities.length < 3 && (
            <Button
              label="+ Add"
              size="small"
              variant="outline"
              onPress={() => {
                setEditingPriority(null);
                setPriorityTitleInput('');
              }}
            />
          )}
        </View>

        {/* Priority Items */}
        <View style={styles.priorityList}>
          {tomorrowPriorities.length === 0 ? (
            <Text style={[typography.caption, { color: colors.mutedText, paddingVertical: 12 }]}>
              No priorities set yet. Add up to 3 for tomorrow.
            </Text>
          ) : (
            tomorrowPriorities.map((p, index) => (
              <View key={p.id} style={styles.priorityItemRow}>
                <Pressable
                  onPress={() => handleTogglePriority(p)}
                  style={[
                    styles.checkbox,
                    {
                      borderColor: p.completedAt ? colors.primaryAction : colors.border,
                      backgroundColor: p.completedAt ? colors.primaryAction : 'transparent',
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: p.completedAt != null }}
                >
                  {p.completedAt && <AppIcon name="check" size={12} color={colors.onPrimaryAction} />}
                </Pressable>

                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: p.completedAt ? colors.mutedText : colors.primaryText,
                      textDecorationLine: p.completedAt ? 'line-through' : 'none',
                      flex: 1,
                      marginLeft: 12,
                    },
                  ]}
                >
                  {p.title}
                </Text>

                <View style={styles.reorderBtns}>
                  {index > 0 && (
                    <Pressable onPress={() => handleReorder(index, 'up')} style={styles.reorderArrow}>
                      <Text style={{ color: colors.secondaryText, fontSize: 16 }}>▲</Text>
                    </Pressable>
                  )}
                  {index < tomorrowPriorities.length - 1 && (
                    <Pressable onPress={() => handleReorder(index, 'down')} style={styles.reorderArrow}>
                      <Text style={{ color: colors.secondaryText, fontSize: 16 }}>▼</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Add Row if under 3 */}
        {tomorrowPriorities.length < 3 && (
          <View style={styles.quickAddRow}>
            <Input
              placeholder="e.g. Finish presentation deck"
              value={priorityTitleInput}
              onChangeText={setPriorityTitleInput}
              style={{ flex: 1 }}
            />
            <Button
              label="Save"
              size="small"
              onPress={handleAddOrEditPriority}
              style={{ marginLeft: 8, height: 48 }}
            />
          </View>
        )}
      </Card>

      {/* Finalize Tomorrow CTA */}
      <View style={{ marginTop: 24 }}>
        <Button
          label={isFinalized ? '✓ Finalized · Rest Well' : 'Finalize Tomorrow · Close Today'}
          icon={<AppIcon name="moon" size={20} color={colors.onPrimaryAction} />}
          size="large"
          onPress={() => {
            setIsFinalized(true);
            Alert.alert('Today closed', "You're all set for tomorrow. Sleep well.");
          }}
        />
      </View>
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
  horizonHeader: {
    height: 180,
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    marginBottom: 16,
  },
  headerTextOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  rangeTabs: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 16,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  chartCard: {
    alignItems: 'center',
  },
  legendContainer: {
    width: '100%',
    marginTop: 20,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  prioritiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  priorityList: {
    gap: 10,
  },
  priorityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  reorderArrow: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
});
