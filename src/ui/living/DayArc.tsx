import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { LivingDayPhase } from '../../domain/dayState';

interface DayArcProps {
  progress: number; // 0..1 across local day elapsed
  phase: LivingDayPhase;
}

/**
 * Precise Day Arc: one authored horizon arc with a sun/moon position derived
 * from the local day. Decorative (aria-hidden); timer text stays native.
 */
export const DayArc: React.FC<DayArcProps> = ({ progress, phase }) => {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const x = 20 + clamped * 320;
  // Arc peak at midday: y follows a shallow parabola.
  const y = 64 - Math.sin(clamped * Math.PI) * 34;
  const sleeping = phase === 'sleeping';

  return (
    <View style={styles.wrap} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="76" viewBox="0 0 360 76" preserveAspectRatio="xMidYMid meet">
        <Path
          d="M20,64 Q180,-8 340,64"
          stroke={colors.border}
          strokeWidth={1.5}
          fill="transparent"
          strokeDasharray="3 5"
          opacity={0.9}
        />
        <Line x1="12" y1="64" x2="348" y2="64" stroke={colors.border} strokeWidth={1} opacity={0.7} />
        <Circle
          cx={x}
          cy={y}
          r={sleeping ? 7 : 9}
          fill={sleeping ? '#C7D2FE' : colors.sunDisc}
          opacity={0.95}
        />
        {sleeping && <Circle cx={x} cy={y} r={13} fill="transparent" stroke="#C7D2FE" strokeWidth={1} opacity={0.5} />}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%', height: 76 },
});
