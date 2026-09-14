import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import { typography } from './tokens';

export interface DonutSegment {
  label: string;
  value: number; // milliseconds or hours
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerPrimaryText?: string;
  centerSecondaryText?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 200,
  strokeWidth = 24,
  centerPrimaryText = '24h',
  centerSecondaryText = 'Total Day',
}) => {
  const { colors } = useTheme();

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke segments: each slice draws only its fraction of the ring,
  // accumulated from the top (-90deg). dasharray=fraction*C prevents the
  // overdraw where every slice previously rendered a full circle.
  let accumulatedFraction = 0;
  const renderedSegments = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const dashOn = Math.max(0, fraction * circumference - 1.5);
    const rotation = accumulatedFraction * 360 - 90;
    accumulatedFraction += fraction;

    return {
      ...seg,
      fraction,
      dashOn,
      rotation,
    };
  });

  // Accessible summary for screen readers
  const accessibleSummary = segments
    .filter((s) => s.value > 0)
    .map((s) => `${s.label}: ${Math.round((s.value / (total || 1)) * 100)}%`)
    .join(', ');

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Day balance chart: ${accessibleSummary}`}
    >
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceRaised}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Segments */}
        <G>
          {renderedSegments.map((seg, idx) => {
            if (seg.fraction <= 0) return null;
            return (
              <Circle
                key={`slice-${idx}-${seg.label}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashOn} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
                fill="transparent"
                transform={`rotate(${seg.rotation} ${size / 2} ${size / 2})`}
              />
            );
          })}
        </G>
      </Svg>

      {/* Center Text */}
      <View style={styles.centerContainer}>
        <Text
          style={[
            typography.greeting,
            { color: colors.primaryText, fontSize: 28, lineHeight: 32 },
          ]}
        >
          {centerPrimaryText}
        </Text>
        {centerSecondaryText && (
          <Text style={[typography.metadata, { color: colors.secondaryText, marginTop: 2 }]}>
            {centerSecondaryText}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  centerContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
