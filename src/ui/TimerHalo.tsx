import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import { SessionStatus } from '../domain/types';

interface TimerHaloProps {
  status: SessionStatus | 'idle';
  size?: number;
  strokeWidth?: number;
  targetSeconds?: number | null;
  elapsedSeconds?: number;
  children?: React.ReactNode;
}

export const TimerHalo: React.FC<TimerHaloProps> = ({
  status,
  size = 260,
  strokeWidth = 3,
  targetSeconds,
  elapsedSeconds = 0,
  children,
}) => {
  const { colors, reducedMotion } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  useEffect(() => {
    if (reducedMotion || !isRunning) {
      pulseAnim.setValue(1);
      return;
    }

    // 6-second subtle breathing cycle
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isRunning, reducedMotion, pulseAnim]);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Optional target progress arc
  let strokeDashoffset = circumference;
  if (targetSeconds && targetSeconds > 0) {
    const progress = Math.min(1, elapsedSeconds / targetSeconds);
    strokeDashoffset = circumference * (1 - progress);
  }

  const haloColor = isRunning ? colors.haloAccent : isPaused ? colors.amber : colors.border;
  const glowOpacity = isRunning ? 0.35 : isPaused ? 0.15 : 0.05;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer subtle glow background */}
      <Animated.View
        style={[
          styles.haloLayer,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.04],
              outputRange: [glowOpacity, glowOpacity + 0.15],
            }),
          },
        ]}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="70%" stopColor={haloColor} stopOpacity={glowOpacity} />
              <Stop offset="100%" stopColor={haloColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#haloGlow)" />
        </Svg>
      </Animated.View>

      {/* SVG Ring Tracks */}
      <Svg width={size} height={size} style={styles.svgRing}>
        {/* Track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.haloTrack}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* State / Progress arc */}
        {targetSeconds && targetSeconds > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={haloColor}
            strokeWidth={strokeWidth + 1}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={haloColor}
            strokeWidth={isRunning ? strokeWidth + 1 : strokeWidth}
            opacity={isRunning ? 0.9 : 0.4}
            fill="transparent"
          />
        )}
      </Svg>

      {/* Center content (Timer digits, status, activity name) */}
      <View style={styles.centerContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  haloLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 16,
  },
});
