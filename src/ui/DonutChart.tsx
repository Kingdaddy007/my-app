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

  // Compute stroke offsets for each slice
  let accumulatedAngle = 0;
  const renderedSegments = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const strokeDashoffset = circumference * (1 - fraction);
    const rotation = (accumulatedAngle / (total || 1)) * 360 - 90;
    accumulatedAngle += seg.value;

    return {
      ...seg,
      fraction,
      strokeDashoffset,
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
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                fill="transparent"
                rotation={seg.rotation}
                origin={`${size / 2}, ${size / 2}`}
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
