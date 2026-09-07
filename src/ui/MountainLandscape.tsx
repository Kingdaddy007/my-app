import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './ThemeContext';

interface MountainLandscapeProps {
  width?: number;
  height?: number;
  isNight?: boolean;
}

export const MountainLandscape: React.FC<MountainLandscapeProps> = ({
  width = 360,
  height = 260,
}) => {
  const { mode, colors } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 260" preserveAspectRatio="xMidYMid slice">
        <Defs>
          {/* Sky Gradient */}
          <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.skyGradientTop} />
            <Stop offset="65%" stopColor={colors.skyGradientBottom} />
            <Stop offset="100%" stopColor={colors.canvas} />
          </LinearGradient>

          {/* Sun Glow Gradient */}
          <RadialGradient id="sunGlowGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.sunDisc} stopOpacity="0.8" />
            <Stop offset="40%" stopColor={colors.sunGlow} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={colors.skyGradientBottom} stopOpacity="0" />
          </RadialGradient>

          {/* Mist Layer Gradient */}
          <LinearGradient id="mistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.canvas} stopOpacity="0" />
            <Stop offset="100%" stopColor={colors.canvas} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Sky Background */}
        <Rect x="0" y="0" width="360" height="260" fill="url(#skyGrad)" />

        {/* Sun Disc & Atmosphere Glow */}
        <Circle cx="180" cy="115" r="70" fill="url(#sunGlowGrad)" />
        <Circle
          cx="180"
          cy="115"
          r="26"
          fill={colors.sunDisc}
          opacity={isDark ? 0.95 : 0.85}
        />

        {/* Stars (subtle in dark mode) */}
        {isDark && (
          <>
            <Circle cx="45" cy="35" r="1" fill="#FFF" opacity="0.6" />
            <Circle cx="85" cy="55" r="1.2" fill="#FFF" opacity="0.8" />
            <Circle cx="130" cy="25" r="0.8" fill="#FFF" opacity="0.4" />
            <Circle cx="230" cy="40" r="1" fill="#FFF" opacity="0.5" />
            <Circle cx="280" cy="65" r="1.3" fill="#FFF" opacity="0.7" />
            <Circle cx="315" cy="30" r="0.9" fill="#FFF" opacity="0.4" />
          </>
        )}

        {/* Distant Mountain Range (Soft misted silhouette) */}
        <Path
          d="M0,175 L35,152 L70,165 L120,135 L165,158 L210,130 L260,162 L305,142 L360,170 L360,260 L0,260 Z"
          fill={colors.mountainFar}
          opacity={isDark ? 0.65 : 0.75}
        />

        {/* Mid-range Mountain Ridge (Chiseled peaks) */}
        <Path
          d="M0,195 L40,172 L95,200 L145,160 L180,185 L225,155 L280,192 L320,168 L360,190 L360,260 L0,260 Z"
          fill={colors.mountainMid}
          opacity={isDark ? 0.85 : 0.85}
        />

        {/* Foreground Ridge (Sharp dark silhouette) */}
        <Path
          d="M0,215 L55,190 L110,218 L160,186 L205,212 L250,182 L300,210 L360,198 L360,260 L0,260 Z"
          fill={colors.mountainNear}
          opacity={isDark ? 0.95 : 0.95}
        />

        {/* Base Foothills / Mist blend into canvas */}
        <Path
          d="M0,235 Q90,215 180,225 T360,228 L360,260 L0,260 Z"
          fill={colors.mountainForeground}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
