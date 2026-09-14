import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, typography } from '../tokens';
import { LivingDayPhase, formatLivingDuration } from '../../domain/dayState';

export type HeroTone = 'idle' | 'running' | 'paused' | 'sleep' | 'overtime';

interface LivingHeroProps {
  phase: LivingDayPhase;
  timerMs: number;
  timerLabel: string;
  title: string;
  subtitle: string;
  timerAccessibilityLabel: string;
  breathing?: boolean;
  dayProgress?: number;
  compact?: boolean;
}

/**
 * The Living Day hero: one state-responsive visual world. Atmosphere (sky,
 * Day Arc, halo tone) changes with phase; timer digits stay native tabular
 * text over a reliable scrim. While running or sleeping (and motion allowed),
 * the halo performs a slow 6s luminance breath driven by Animated — never a
 * static opacity claim. Reduced motion renders a static state.
 */
export const LivingHero: React.FC<LivingHeroProps> = ({
  phase,
  timerMs,
  timerLabel,
  title,
  subtitle,
  timerAccessibilityLabel,
  breathing = true,
  dayProgress,
  compact = false,
}) => {
  const { colors, reducedMotion } = useTheme();
  const tone: HeroTone =
    phase === 'sleeping' ? 'sleep' : phase === 'paused' ? 'paused' : phase === 'running' ? 'running' : 'idle';
  const haloColor =
    tone === 'sleep' ? '#818CF8' : tone === 'paused' ? colors.amber : colors.primaryAction;
  const animate = breathing && !reducedMotion && (phase === 'running' || phase === 'sleeping');

  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, breath]);

  const haloOpacity = animate
    ? breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
    : 0.85;
  const haloScale = animate
    ? breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] })
    : 1;

  const landscapeHeight = compact ? 330 : 380;

  return (
    <View
      style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLabel={`${title}. ${timerAccessibilityLabel}`}
    >
      <View style={[styles.landscape, { height: landscapeHeight }]}>
        <Animated.Image
          source={require('../../../assets/aevia-horizon.png')}
          resizeMode="cover"
          style={[
            styles.worldImage,
            {
              opacity: tone === 'sleep' ? 0.56 : tone === 'paused' ? 0.72 : 0.82,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
      </View>
      <View style={[styles.stateWash, { backgroundColor: tone === 'paused' ? 'rgba(91,48,17,0.26)' : tone === 'sleep' ? 'rgba(7,12,37,0.52)' : 'rgba(7,11,20,0.18)' }]} />
      <View style={styles.lowerScrim} />
      <View style={styles.worldMetaRow}>
        <Text style={styles.worldMeta}>A E V I A</Text>
        <Text style={styles.worldMeta}>{tone === 'sleep' ? 'DAY AT REST' : `${Math.round((dayProgress ?? 0) * 100)}% OF DAY`}</Text>
      </View>
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.halo,
            { borderColor: haloColor, opacity: haloOpacity, transform: [{ scale: haloScale }] },
          ]}
        />
        <Text style={[typography.metadata, styles.stateLabel, { color: tone === 'paused' ? '#FFD39A' : tone === 'sleep' ? '#BEC8FF' : '#FFBF87' }]}>{timerLabel}</Text>
        <Text
          style={[typography.timer, styles.timer, { color: '#FFFFFF' }]}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={timerAccessibilityLabel}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.0}
        >
          {formatLivingDuration(timerMs)}
        </Text>
        <Text style={[typography.title, { color: '#FFFFFF', textAlign: 'center' }]} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[typography.body, { color: 'rgba(238,242,248,0.76)', textAlign: 'center', marginTop: 6 }]} numberOfLines={3}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: radii.card,
    overflow: 'hidden',
    position: 'relative',
  },
  landscape: { width: '100%' },
  worldImage: {
    position: 'absolute',
    top: -16,
    right: -8,
    bottom: -16,
    left: -8,
    width: '104%',
    height: '112%',
  },
  stateWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  lowerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '78%',
    backgroundColor: 'rgba(4, 8, 16, 0.56)',
  },
  worldMetaRow: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  worldMeta: {
    color: 'rgba(245,248,252,0.62)',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1.45,
  },
  body: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 58,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 5,
  },
  halo: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 1.5,
    backgroundColor: 'rgba(4, 18, 18, 0.20)',
  },
  stateLabel: {
    letterSpacing: 2.2,
    fontWeight: '700',
    marginBottom: 2,
  },
  timer: {
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    fontSize: 60,
    lineHeight: 66,
  },
});
