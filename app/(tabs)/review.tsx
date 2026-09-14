import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/ui/ThemeContext';
import { useApp } from '../../src/data/AppContext';
import { DonutChart, DonutSegment } from '../../src/ui/DonutChart';
import { WeeklyTrendChart, DayBarData } from '../../src/ui/WeeklyTrendChart';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { Input } from '../../src/ui/components/Input';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { ActiveSessionBar } from '../../src/ui/ActiveSessionBar';
import { radii, spacing, typography } from '../../src/ui/tokens';
import { formatDurationCompact } from '../../src/domain/insights';
import { computeDayAccounting, formatLocalDate, getLocalDayBounds } from '../../src/domain/dayCalculator';
import { Priority } from '../../src/domain/types';

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { repo, todayAccounting, categories, refresh, settings } = useApp();

  const [reviewRange, setReviewRange] = useState<'day' | 'week'>('day');
  const [tomorrowPriorities, setTomorrowPriorities] = useState<Priority[]>([]);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [priorityTitleInput, setPriorityTitleInput] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);

  // Dynamic weekly trend data
  const [weeklyDays, setWeeklyDays] = useState<DayBarData[]>([]);
  const [weeklyActiveTotalMs, setWeeklyActiveTotalMs] = useState<number>(0);
  const [weeklyCategoryTotals, setWeeklyCategoryTotals] = useState<Map<string, number>>(new Map());
  const [weeklyPauseMs, setWeeklyPauseMs] = useState<number>(0);
  const [weeklySleepMs, setWeeklySleepMs] = useState<number>(0);
  const [weeklyUntrackedMs, setWeeklyUntrackedMs] = useState<number>(0);
  const [weeklyComparisonText, setWeeklyComparisonText] = useState<string | null>(null);
  const [hasSparseWeekData, setHasSparseWeekData] = useState<boolean>(true);

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

  // Load real weekly data across last 7 days
  useEffect(() => {
    let isMounted = true;
    const loadWeeklyData = async () => {
      if (!repo) return;

      const now = new Date();
      const todayStr = formatLocalDate(now);
      const rawIntervals = await repo.getIntervals();
      const sessions = await repo.getSessions();
      const acts = await repo.getActivities(true);
      const cats = await repo.getCategories();

      const actMap = new Map<string, string>(); // actId -> catId
      for (const a of acts) actMap.set(a.id, a.categoryId);

      const days: DayBarData[] = [];
      let totalActiveMs = 0;
      let totalPauseMs = 0;
      let totalSleepMs = 0;
      let totalUntrackedMs = 0;
      let activeDaysCount = 0;
      const catTotals = new Map<string, number>();

      // Iterate 7 days ending with today
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = formatLocalDate(d);
        const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(d);
        const bounds = getLocalDayBounds(dStr);
        const dayLimit = dStr === todayStr ? Math.min(Date.now(), bounds.dayEndMs) : bounds.dayEndMs;

        const dayAcc = computeDayAccounting(
          dStr,
          dayLimit,
          rawIntervals,
          sessions,
          acts,
          cats,
          settings.trackingAwarenessStartedAtMs
        );

        if (dayAcc.accountedActiveMs > 0) {
          activeDaysCount++;
        }
        totalActiveMs += dayAcc.accountedActiveMs;
        totalPauseMs += dayAcc.accountedPauseMs;
        totalSleepMs += dayAcc.accountedSleepMs;
        totalUntrackedMs += dayAcc.untrackedMs;

        // Aggregate category totals
        for (const ct of dayAcc.categoryTotals) {
          const prev = catTotals.get(ct.categoryId) ?? 0;
          catTotals.set(ct.categoryId, prev + ct.totalMs);
        }

        days.push({
          dayLabel,
          activeMs: dayAcc.accountedActiveMs,
          isToday: dStr === todayStr,
        });
      }

      // Check sparse week data
      const isSparse = activeDaysCount < 2 || totalActiveMs < 15 * 60 * 1000;

      // Compute honest week-over-week comparison if prior week data exists
      let compText: string | null = null;
      if (!isSparse) {
        // Look at previous 7 days (days -13 to -7)
        let priorWeekActiveMs = 0;
        for (let i = 13; i >= 7; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = formatLocalDate(d);
          const bounds = getLocalDayBounds(dStr);
          const dayAcc = computeDayAccounting(
            dStr,
            bounds.dayEndMs,
            rawIntervals,
            sessions,
            acts,
            cats,
            settings.trackingAwarenessStartedAtMs
          );
          priorWeekActiveMs += dayAcc.accountedActiveMs;
        }

        if (priorWeekActiveMs > 0) {
          const diffPct = Math.round(((totalActiveMs - priorWeekActiveMs) / priorWeekActiveMs) * 100);
          const sign = diffPct >= 0 ? '+' : '';
          compText = `${sign}${diffPct}% vs last week (recorded time)`;
        } else {
          compText = `${formatDurationCompact(totalActiveMs)} recorded across ${activeDaysCount} days`;
        }
      }

      if (isMounted) {
        setWeeklyDays(days);
        setWeeklyActiveTotalMs(totalActiveMs);
        setWeeklyCategoryTotals(catTotals);
        setWeeklyPauseMs(totalPauseMs);
        setWeeklySleepMs(totalSleepMs);
        setWeeklyUntrackedMs(totalUntrackedMs);
        setHasSparseWeekData(isSparse);
        setWeeklyComparisonText(compText);
      }
    };

    loadWeeklyData();
    return () => {
      isMounted = false;
    };
  }, [repo, todayAccounting, settings.trackingAwarenessStartedAtMs]);

  // Donut chart segments: use user categories breakdown (respects DESIGN.md line 64)
  const donutSegments: DonutSegment[] = useMemo(() => {
    if (reviewRange === 'day') {
      if (!todayAccounting) return [];
      const segs: DonutSegment[] = [];

      // 1. User categories
      for (const ct of todayAccounting.categoryTotals) {
        // Sleep has its own explicit accounting bucket below; rendering its
        // category again would double-count it and duplicate the legend.
        if (ct.totalMs > 0 && ct.categoryId !== 'cat-sleep' && ct.categoryName.toLowerCase() !== 'sleep') {
          segs.push({
            label: ct.categoryName,
            value: ct.totalMs,
            color: ct.color,
          });
        }
      }

      // 2. Explicit pauses
      if (todayAccounting.accountedPauseMs > 0) {
        segs.push({
          label: 'Pauses & Breaks',
          value: todayAccounting.accountedPauseMs,
          color: colors.amber,
        });
      }

      // 3. Sleep
      if (todayAccounting.accountedSleepMs > 0) {
        segs.push({
          label: 'Sleep',
          value: todayAccounting.accountedSleepMs,
          color: colors.mountainFar,
        });
      }

      // 4. Untracked
      if (todayAccounting.untrackedMs > 0) {
        segs.push({
          label: 'Untracked',
          value: todayAccounting.untrackedMs,
          color: colors.mountainMid,
        });
      }

      return segs;
    } else {
      // Weekly view
      const segs: DonutSegment[] = [];
      for (const cat of categories) {
        const total = weeklyCategoryTotals.get(cat.id) ?? 0;
        if (total > 0 && cat.id !== 'cat-sleep' && cat.name.toLowerCase() !== 'sleep') {
          segs.push({
            label: cat.name,
            value: total,
            color: cat.color,
          });
        }
      }
      if (weeklyPauseMs > 0) {
        segs.push({
          label: 'Pauses & Breaks',
          value: weeklyPauseMs,
          color: colors.amber,
        });
      }
      if (weeklySleepMs > 0) {
        segs.push({
          label: 'Sleep',
          value: weeklySleepMs,
          color: colors.mountainFar,
        });
      }
      if (weeklyUntrackedMs > 0) {
        segs.push({
          label: 'Untracked',
          value: weeklyUntrackedMs,
          color: colors.mountainMid,
        });
      }
      return segs;
    }
  }, [reviewRange, todayAccounting, categories, weeklyCategoryTotals, weeklyPauseMs, weeklySleepMs, weeklyUntrackedMs, colors]);

  const activeFocusDuration = reviewRange === 'day'
    ? (todayAccounting?.accountedActiveMs ?? 0)
    : weeklyActiveTotalMs;

  const handleTogglePriority = async (p: Priority) => {
    if (!repo) return;
    p.completedAt = p.completedAt ? null : Date.now();
    await repo.savePriority(p);
    await loadTomorrowPriorities();
  };

  const handleStartEditPriority = (p: Priority) => {
    setEditingPriority(p);
    setPriorityTitleInput(p.title);
  };

  const handleDeletePriority = async (pId: string) => {
    if (!repo) return;
    await repo.deletePriority(pId);
    if (editingPriority?.id === pId) {
      setEditingPriority(null);
      setPriorityTitleInput('');
    }
    await loadTomorrowPriorities();
  };

  const handleAddOrEditPriority = async () => {
    if (!repo || !priorityTitleInput.trim()) return;

    if (editingPriority) {
      editingPriority.title = priorityTitleInput.trim();
      await repo.savePriority(editingPriority);
    } else {
      if (tomorrowPriorities.length >= 3) {
        Alert.alert('Maximum reached', 'AEVIA keeps tomorrow focused with exactly 3 priorities.');
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
      <ImageBackground
        source={require('../../assets/aevia-horizon.png')}
        style={[styles.horizonHeader, { borderColor: colors.border }]}
        imageStyle={styles.horizonImage}
      >
        <View style={styles.horizonVeil} />
        <View style={styles.headerTextOverlay}>
          <Text style={[typography.metadata, { color: '#FFBF87', letterSpacing: 2 }]}>
            THE DAY IN VIEW
          </Text>
          <Text style={[typography.greeting, { color: '#FFFFFF', marginTop: 4 }]}>
            Progress over perfection.
          </Text>
        </View>
      </ImageBackground>

      <ActiveSessionBar />

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
            accessibilityRole="tab"
            accessibilityState={{ selected: reviewRange === r }}
            aria-selected={reviewRange === r}
            accessibilityLabel={r === 'day' ? "Today's review" : "This week's review"}
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

      {/* Donut Chart: Balance of the Day / Week */}
      <Card variant="surface" style={styles.chartCard}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 16 }]}>
          {reviewRange === 'day' ? "Today's Balance" : "This Week's Balance"}
        </Text>

        <DonutChart
          segments={donutSegments}
          size={210}
          centerPrimaryText={formatDurationCompact(activeFocusDuration)}
          centerSecondaryText={reviewRange === 'day' ? 'Active recorded today' : 'Active recorded this week'}
        />

        {/* Breakdown List — each row links to its source intervals in Timeline */}
        <View style={styles.legendContainer}>
          {donutSegments.length === 0 ? (
            <Text style={[typography.caption, { color: colors.secondaryText, textAlign: 'center' }]}>
              No recorded time in this period yet.
            </Text>
          ) : (
            donutSegments.map((seg) => (
              <Pressable
                key={seg.label}
                onPress={() => router.push('/(tabs)/timeline')}
                style={styles.legendRow}
                accessibilityRole="button"
                accessibilityLabel={`${seg.label}, ${formatDurationCompact(seg.value)}. Open source intervals in Timeline.`}
              >
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={[typography.bodyMedium, { color: colors.primaryText, flex: 1, marginLeft: 10 }]}>
                  {seg.label}
                </Text>
                <Text style={[typography.bodyMedium, { color: colors.secondaryText, fontWeight: '600' }]}>
                  {formatDurationCompact(seg.value)}
                </Text>
                <AppIcon name="chevron-forward" size={14} color={colors.mutedText} />
              </Pressable>
            ))
          )}
        </View>
      </Card>

      {/* Mindful Reflection Card (From Mockups) */}
      <Card variant="subtle" padding={14} style={{ marginTop: 16 }}>
        <View style={styles.quoteRow}>
          <AppIcon name="quote" size={18} color={colors.primaryAction} />
          <Text style={[typography.bodyMedium, { color: colors.primaryText, fontStyle: 'italic', marginLeft: 10, flex: 1 }]}>
            {activeFocusDuration > 0
              ? reviewRange === 'day'
                ? `"${formatDurationCompact(activeFocusDuration)} of active time is recorded today."`
                : `"${formatDurationCompact(activeFocusDuration)} of active time is recorded this week."`
              : '"No active time is recorded for this period yet."'}
          </Text>
        </View>
      </Card>

      {/* Transparent Arithmetic Insights */}
      {reviewRange === 'day' && todayAccounting && (
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

      {/* Weekly Trend Bar Chart (Real Dynamic Data, Honest Sparse Fallback) */}
      <Card variant="surface" style={{ marginTop: 16 }}>
        <View style={styles.weeklyHeader}>
          <Text style={[typography.sectionTitle, { color: colors.primaryText }]}>
            Weekly Trend
          </Text>
          {weeklyComparisonText && (
            <Text style={[typography.metadata, { color: colors.primaryAction, fontWeight: '600' }]}>
              {weeklyComparisonText}
            </Text>
          )}
        </View>

        {hasSparseWeekData ? (
          <View style={styles.sparseBox}>
            <WeeklyTrendChart days={weeklyDays} />
            <Text style={[typography.caption, { color: colors.secondaryText, textAlign: 'center', marginTop: 8 }]}>
              Weekly trend patterns build as you record days this week.
            </Text>
          </View>
        ) : (
          <WeeklyTrendChart days={weeklyDays} />
        )}
      </Card>

      {/* Tomorrow's 3 Priorities */}
      <Card variant="surface" style={{ marginTop: 20 }}>
        <View style={styles.prioritiesHeader}>
          <View>
            <Text style={[typography.sectionTitle, { color: colors.primaryText }]}>
              Tomorrow's 3 Priorities
            </Text>
            <Text style={[typography.caption, { color: colors.secondaryText }]}>
              A focused tomorrow starts tonight. (Max 3)
            </Text>
          </View>
          {tomorrowPriorities.length < 3 && !editingPriority && (
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
                  accessibilityLabel={`Mark ${p.title} ${p.completedAt ? 'incomplete' : 'complete'}`}
                >
                  {p.completedAt && <AppIcon name="check" size={12} color={colors.onPrimaryAction} />}
                </Pressable>

                <Pressable
                  onPress={() => handleStartEditPriority(p)}
                  style={{ flex: 1, marginLeft: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit priority ${p.title}`}
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: p.completedAt ? colors.mutedText : colors.primaryText,
                        textDecorationLine: p.completedAt ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {p.title}
                  </Text>
                </Pressable>

                {/* Edit & Delete actions */}
                <Pressable
                  onPress={() => handleStartEditPriority(p)}
                  style={styles.actionIconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Edit priority title"
                >
                  <AppIcon name="settings" size={16} color={colors.secondaryText} />
                </Pressable>

                <Pressable
                  onPress={() => handleDeletePriority(p.id)}
                  style={styles.actionIconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete priority"
                >
                  <AppIcon name="close" size={16} color={colors.mutedText} />
                </Pressable>

                {/* Reorder Arrows */}
                <View style={styles.reorderBtns}>
                  {index > 0 && (
                    <Pressable
                      onPress={() => handleReorder(index, 'up')}
                      style={styles.reorderArrow}
                      accessibilityRole="button"
                      accessibilityLabel="Move priority up"
                    >
                      <AppIcon name="chevron-up" size={20} color={colors.secondaryText} />
                    </Pressable>
                  )}
                  {index < tomorrowPriorities.length - 1 && (
                    <Pressable
                      onPress={() => handleReorder(index, 'down')}
                      style={styles.reorderArrow}
                      accessibilityRole="button"
                      accessibilityLabel="Move priority down"
                    >
                      <AppIcon name="chevron-down" size={20} color={colors.secondaryText} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Add / Edit Row */}
        {(tomorrowPriorities.length < 3 || editingPriority) && (
          <View style={styles.quickAddContainer}>
            {editingPriority && (
              <View style={styles.editingBanner}>
                <Text style={[typography.metadata, { color: colors.primaryAction }]}>
                  Editing priority:
                </Text>
                <Pressable
                  onPress={() => {
                    setEditingPriority(null);
                    setPriorityTitleInput('');
                  }}
                >
                  <Text style={[typography.metadata, { color: colors.secondaryText }]}>Cancel</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.quickAddRow}>
              <Input
                placeholder="e.g. Finish presentation deck"
                value={priorityTitleInput}
                onChangeText={setPriorityTitleInput}
                style={{ flex: 1 }}
              />
              <Button
                label={editingPriority ? 'Update' : 'Save'}
                size="small"
                onPress={handleAddOrEditPriority}
                style={{ marginLeft: 8, height: 48 }}
              />
            </View>
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
  horizonImage: {
    borderRadius: radii.card,
  },
  horizonVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 8, 17, 0.42)',
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
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sparseBox: {
    paddingVertical: 4,
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
  actionIconBtn: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  reorderBtns: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 4,
  },
  reorderArrow: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddContainer: {
    marginTop: 12,
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
