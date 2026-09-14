import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../data/AppContext';
import { useTheme } from './ThemeContext';
import { AppIcon } from './components/AppIcon';
import { radii, typography } from './tokens';

function durationLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function ActiveSessionBar() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currentSession, activities, liveElapsedSeconds, liveSleepSeconds, openInterval, wakeUpSession } = useApp();

  if (!currentSession) return null;
  const sleeping = openInterval?.kind === 'sleep';
  const activity = activities.find((item) => item.id === currentSession.activityId);
  const experience = sleeping ? 'Sleep' : currentSession.experience === 'focus' ? 'Focus' : 'Track';

  const handleWake = async () => {
    try {
      await wakeUpSession();
      // Land on Today so the dawn summary reveals there.
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Could not wake', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (sleeping) {
    // App-wide sleep veil: sleep is visible and endable from every tab, with
    // no nested pressables. Tapping the veil opens Today; the button wakes.
    return (
      <View
        style={[styles.bar, { backgroundColor: '#141E2A', borderColor: '#818CF8' }]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={`Sleep recording, ${durationLabel(liveSleepSeconds)}. Wake from here or open Today.`}
      >
        <View style={[styles.pulse, { backgroundColor: '#818CF8' }]} />
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Open Today sleep controls"
          style={{ flex: 1 }}
        >
          <View style={styles.copy}>
            <Text style={[typography.metadata, { color: '#818CF8' }]}>SLEEP RECORDING</Text>
            <Text numberOfLines={1} style={[typography.bodyMedium, { color: '#E0E7FF' }]}>
              Sleeping · {durationLabel(liveSleepSeconds)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={handleWake}
          accessibilityRole="button"
          accessibilityLabel="I'm awake. End sleep now."
          accessibilityHint="Ends sleep from any tab and opens the dawn summary on Today"
          style={({ pressed }) => [
            styles.wakeBtn,
            { backgroundColor: '#818CF8', opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[typography.bodyMedium, { color: '#0A1017', fontWeight: '700' }]}>I'm awake</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.replace('/(tabs)')}
      accessibilityRole="button"
      accessibilityHint="Returns to Today without changing the session"
      accessibilityLabel={`${experience} session active for ${activity?.name ?? 'activity'}, ${durationLabel(
        liveElapsedSeconds
      )}. Open session controls.`}
      style={({ pressed }) => [
        styles.bar,
        {
          backgroundColor: colors.actionSubtle,
          borderColor: colors.primaryAction,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={[styles.pulse, { backgroundColor: colors.primaryAction }]} />
      <View style={styles.copy}>
        <Text style={[typography.metadata, { color: colors.primaryAction }]}>{experience.toUpperCase()} ACTIVE</Text>
        <Text numberOfLines={1} style={[typography.bodyMedium, { color: colors.primaryText }]}>
          {activity?.name ?? 'Current session'} · {durationLabel(liveElapsedSeconds)}
        </Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color={colors.primaryAction} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: radii.control,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  pulse: { width: 10, height: 10, borderRadius: 5 },
  copy: { flex: 1, gap: 2 },
  wakeBtn: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
