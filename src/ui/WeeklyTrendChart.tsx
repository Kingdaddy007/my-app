import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { radii, typography } from './tokens';

export interface DayBarData {
  dayLabel: string; // 'M', 'T', 'W', etc.
  activeMs: number;
  isToday?: boolean;
}

interface WeeklyTrendChartProps {
  days: DayBarData[];
  maxDailyTargetMs?: number; // e.g. 8 hours (8 * 3600 * 1000)
}

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({
  days,
  maxDailyTargetMs = 8 * 3600 * 1000,
}) => {
  const { colors } = useTheme();

  // Find max value among days or target to scale bars
  const highestMs = Math.max(
    maxDailyTargetMs,
    ...days.map((d) => d.activeMs)
  );
  const accessibleSummary = days
    .map((d) => `${d.dayLabel}: ${Math.round((d.activeMs / 3600000) * 10) / 10}h${d.isToday ? ' (today)' : ''}`)
    .join(', ');

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Weekly recorded focus: ${accessibleSummary}`}
    >
      <View style={styles.barsRow}>
        {days.map((d, index) => {
          const ratio = highestMs > 0 ? Math.min(1, d.activeMs / highestMs) : 0;
          const barHeight = Math.max(6, ratio * 90);

          return (
            <View key={`day-${index}-${d.dayLabel}`} style={styles.dayCol}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceRaised }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: d.isToday
                        ? colors.primaryAction
                        : d.activeMs > 0
                        ? colors.mountainMid
                        : 'transparent',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  typography.metadata,
                  {
                    color: d.isToday ? colors.primaryAction : colors.secondaryText,
                    fontWeight: d.isToday ? '700' : '400',
                    marginTop: 8,
                  },
                ]}
              >
                {d.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 90,
    borderRadius: radii.thumb,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.thumb,
  },
});
