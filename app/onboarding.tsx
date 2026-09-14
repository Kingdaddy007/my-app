import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/ThemeContext';
import { useApp } from '../src/data/AppContext';
import { Button } from '../src/ui/components/Button';
import { Input } from '../src/ui/components/Input';
import { AppIcon } from '../src/ui/components/AppIcon';
import { Card } from '../src/ui/components/Card';
import { radii, spacing, typography } from '../src/ui/tokens';
import { SessionExperience, ThemePreference } from '../src/domain/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, setPreference, reducedMotion } = useTheme();
  const { activities, isReady, repo, settings, setSelectedActivity, updateUserSettings, refresh } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(
    Math.min(4, Math.max(1, settings.onboardingStep || 1)) as 1 | 2 | 3 | 4
  );
  const [nameInput, setNameInput] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>('system');
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(activities.slice(0, 4).map((a) => a.id))
  );
  // Hydration guard: activities load asynchronously, so the initial selection
  // may be empty on first render. Hydrate once when they arrive; afterwards
  // the user's explicit choices (including deselecting all) are respected.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current && activities.length > 0) {
      hydratedRef.current = true;
      setSelectedActivities((prev) => (prev.size > 0 ? prev : new Set(activities.slice(0, 4).map((a) => a.id))));
    }
  }, [activities]);
  const [previewExperience, setPreviewExperience] = useState<SessionExperience>('focus');
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewStartedAt, setPreviewStartedAt] = useState<number | null>(null);
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const openingReveal = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (step !== 1) return;
    openingReveal.setValue(reducedMotion ? 1 : 0);
    if (reducedMotion) return;
    Animated.timing(openingReveal, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [openingReveal, reducedMotion, step]);

  useEffect(() => {
    if (!previewRunning || previewStartedAt == null) return;
    const update = () => setPreviewElapsed(Math.floor((Date.now() - previewStartedAt) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [previewRunning, previewStartedAt]);

  const goToStep = async (next: 1 | 2 | 3 | 4) => {
    setStep(next);
    await updateUserSettings({ onboardingStep: next });
  };

  const toggleActivity = (id: string) => {
    const next = new Set(selectedActivities);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 4) {
        Alert.alert('Choose up to four', 'Start with the activities you reach for most. You can add every other activity later.');
        return;
      }
      next.add(id);
    }
    setSelectedActivities(next);
  };

  const handleFinish = async () => {
    // Selection defines quick access, not existence. Every starter remains
    // available; chosen activities become favorites at the top of pickers.
    if (repo) {
      for (const activity of activities) {
        await repo.saveActivity({
          ...activity,
          isFavorite: selectedActivities.has(activity.id),
          isArchived: false,
          updatedAt: Date.now(),
        });
      }
    }

    // 2. Save user preferences
    await updateUserSettings({
      profileName: nameInput.trim() || null,
      themePreference: selectedTheme,
      hasCompletedOnboarding: true,
      onboardingStep: 4,
      trackingAwarenessStartedAtMs: settings.trackingAwarenessStartedAtMs ?? Date.now(),
    });
    const firstSelected = activities.find((activity) => selectedActivities.has(activity.id)) ?? null;
    setSelectedActivity(firstSelected);
    setPreference(selectedTheme);
    await refresh();
    router.replace('/(tabs)');
  };

  if (isReady && step === 1) {
    return (
      <View style={styles.openingRoot}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: openingReveal,
              transform: [
                {
                  scale: openingReveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.035, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <ImageBackground
            source={require('../assets/aevia-horizon.png')}
            resizeMode="cover"
            style={styles.openingArtwork}
          >
            <View style={styles.openingVeil} />
          </ImageBackground>
        </Animated.View>

        <Animated.View
          style={[
            styles.openingContent,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 22,
              opacity: openingReveal,
              transform: [
                {
                  translateY: openingReveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.openingTopRow}>
            <View>
              <Text style={styles.newWordmark}>A E V I A</Text>
              <Text style={styles.brandDescriptor}>A PRIVATE DAY COMPANION</Text>
            </View>
            <View style={styles.arcMark} accessible={false} importantForAccessibility="no-hide-descendants">
              <View style={styles.arcMarkOrbit} />
              <View style={styles.arcMarkSun} />
            </View>
          </View>

          <View style={styles.openingCopy}>
            <View style={styles.privatePill}>
              <AppIcon name="shield" size={14} color="#F8D6B7" />
              <Text style={styles.privatePillText}>YOUR DAY STAYS YOURS</Text>
            </View>
            <Text style={styles.openingHeadline}>See the shape{`\n`}of your day.</Text>
            <Text style={styles.openingBody}>
              Name what matters, protect focused time, and return gently when life interrupts.
            </Text>
            <Button
              label="Begin"
              size="large"
              icon={<AppIcon name="arrow-forward" size={20} color="#07130F" />}
              onPress={() => void goToStep(2)}
              style={styles.openingPrimary}
            />
            <Pressable
              onPress={() => void goToStep(4)}
              accessibilityRole="button"
              accessibilityLabel="See how Aevia works"
              style={({ pressed }) => [styles.openingSecondary, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={styles.openingSecondaryText}>See how it works</Text>
              <AppIcon name="chevron-forward" size={16} color="#DCE9E5" />
            </Pressable>
            <Text style={styles.openingFootnote}>No account needed to begin</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.canvas }]}
    >
      {!isReady ? (
        <View style={[styles.stepContainer, { paddingHorizontal: spacing.pageGutter, paddingTop: insets.top + 20 }]}>
          <Text style={[typography.greeting, { color: colors.primaryText }]}>Preparing AEVIA…</Text>
          <Text style={[typography.body, { color: colors.secondaryText, marginTop: 8 }]}>
            Loading your activities before setup begins.
          </Text>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 },
        ]}
      >
        {/* Step 2: meaningful ownership before preferences */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepRail}><View style={[styles.stepRailFill, { width: '34%', backgroundColor: colors.primaryAction }]} /></View>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>01 · MAKE IT YOURS</Text>
            <Text style={[styles.onboardingTitle, { color: colors.primaryText }]}>What deserves a place in your day?</Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginTop: 8, marginBottom: 20 }]}>Choose up to four. These become your fastest ways to begin, and every choice stays editable.</Text>

            <View style={styles.activityGrid}>
              {activities.map((act) => {
                const isSelected = selectedActivities.has(act.id);
                return (
                  <Pressable
                    key={act.id}
                    onPress={() => toggleActivity(act.id)}
                    style={({ pressed }) => [
                      styles.activityTile,
                      {
                        backgroundColor: isSelected ? colors.actionSubtle : colors.surface,
                        borderColor: isSelected ? colors.primaryAction : colors.borderSubtle,
                        opacity: pressed ? 0.78 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Use starter activity ${act.name}`}
                  >
                    <View style={[styles.activityGlyph, { backgroundColor: isSelected ? colors.primaryAction : colors.surfaceRaised }]}>
                      <AppIcon name={act.iconKey} size={20} color={isSelected ? colors.onPrimaryAction : colors.secondaryText} />
                    </View>
                    <Text numberOfLines={1} style={[typography.bodyMedium, { color: colors.primaryText, flex: 1, marginHorizontal: 10 }]}>{act.name}</Text>
                    <View style={[styles.miniCheck, { borderColor: isSelected ? colors.primaryAction : colors.border }]}>
                      {isSelected ? <AppIcon name="check" size={12} color={colors.primaryAction} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 12 }]}>{selectedActivities.size} of 4 selected</Text>
            <View style={styles.buttonStack}>
              <Button label="Continue" size="large" onPress={() => void goToStep(3)} />
              <Button label="Back" variant="ghost" onPress={() => void goToStep(1)} style={{ marginTop: 6 }} />
            </View>
          </View>
        )}

        {/* Step 3: one preferred rhythm plus lightweight personalization */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepRail}><View style={[styles.stepRailFill, { width: '67%', backgroundColor: colors.primaryAction }]} /></View>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>02 · CHOOSE YOUR RHYTHM</Text>
            <Text style={[styles.onboardingTitle, { color: colors.primaryText }]}>How do you usually begin?</Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginTop: 8, marginBottom: 18 }]}>This is only your smart default. Track stays open-ended; Focus gives a clear finish line.</Text>

            <View style={styles.previewChoices}>
              {(['track', 'focus'] as const).map((experience) => {
                const selected = previewExperience === experience;
                return (
                  <Pressable
                    key={experience}
                    onPress={() => setPreviewExperience(experience)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[styles.previewChoice, { backgroundColor: selected ? colors.actionSubtle : colors.surface, borderColor: selected ? colors.primaryAction : colors.border }]}
                  >
                    <AppIcon name={experience === 'track' ? 'time' : 'target'} size={21} color={selected ? colors.primaryAction : colors.secondaryText} />
                    <Text style={[typography.sectionTitle, { color: colors.primaryText, marginTop: 8 }]}>{experience === 'track' ? 'Track freely' : 'Focus for 45'}</Text>
                    <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 3 }]}>{experience === 'track' ? 'No finish line' : 'A gentle target'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 16 }}>
              <Input label="What should we call you? (optional)" placeholder="Beloved" value={nameInput} onChangeText={setNameInput} maxLength={40} />
            </View>
            <Text style={[typography.metadata, { color: colors.secondaryText, marginTop: 12, marginBottom: 8 }]}>APPEARANCE</Text>
            <View style={styles.themeRow}>
              {(['system', 'light', 'dark'] as const).map((th) => (
                <Pressable
                  key={th}
                  onPress={() => { setSelectedTheme(th); setPreference(th); }}
                  style={[styles.themeOption, { backgroundColor: selectedTheme === th ? colors.primaryAction : colors.surfaceRaised, borderColor: selectedTheme === th ? colors.primaryAction : colors.border }]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedTheme === th }}
                >
                  <Text style={[typography.metadata, { color: selectedTheme === th ? colors.onPrimaryAction : colors.primaryText, fontWeight: '700', textTransform: 'uppercase' }]}>{th}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.buttonStack}>
              <Button label="Try it" size="large" onPress={() => void goToStep(4)} />
              <Button label="Back" variant="ghost" onPress={() => void goToStep(2)} style={{ marginTop: 6 }} />
            </View>
          </View>
        )}

        {/* Step 4: isolated Track / Focus preview. No repository writes. */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepRail}><View style={[styles.stepRailFill, { width: '100%', backgroundColor: colors.primaryAction }]} /></View>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>03 · FEEL ONE MOMENT</Text>
            <Text style={[styles.onboardingTitle, { color: colors.primaryText }]}>Your day has a pulse now.</Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginTop: 8, marginBottom: 18 }]}>Try the interaction. This is a private rehearsal—nothing below becomes history.</Text>

            <View style={styles.previewChoices}>
              {(['track', 'focus'] as const).map((experience) => {
                const selected = previewExperience === experience;
                return (
                  <Pressable
                    key={experience}
                    onPress={() => {
                      setPreviewExperience(experience);
                      setPreviewRunning(false);
                      setPreviewElapsed(0);
                      setPreviewStartedAt(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    accessibilityLabel={experience === 'track' ? 'Track preview, open-ended' : 'Focus preview, 45 minute target'}
                    style={[styles.previewChoice, { backgroundColor: selected ? colors.actionSubtle : colors.surface, borderColor: selected ? colors.primaryAction : colors.border }]}
                  >
                    <AppIcon name={experience === 'track' ? 'time' : 'target'} size={20} color={selected ? colors.primaryAction : colors.secondaryText} />
                    <Text style={[typography.sectionTitle, { color: colors.primaryText, marginTop: 8 }]}>{experience === 'track' ? 'Track' : 'Focus'}</Text>
                    <Text style={[typography.caption, { color: colors.secondaryText }]}>{experience === 'track' ? 'Open-ended' : '45 min target'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <ImageBackground
              source={require('../assets/aevia-horizon.png')}
              style={styles.previewStage}
              imageStyle={styles.previewStageImage}
            >
              <View style={styles.previewStageVeil} />
              <View style={styles.previewStageTop}>
                <Text style={styles.previewStageMeta}>PRIVATE REHEARSAL</Text>
                <View style={styles.previewLivePill}>
                  <View style={[styles.previewLiveDot, { backgroundColor: previewRunning ? '#FFB170' : '#91A7FF' }]} />
                  <Text style={styles.previewLiveText}>{previewRunning ? 'IN MOTION' : 'READY'}</Text>
                </View>
              </View>
              <View style={styles.previewStageCenter}>
                <Text style={styles.previewStageLabel}>{previewExperience === 'track' ? 'TRACKING' : 'FOCUSING'}</Text>
                <Text style={styles.previewStageTimer}>
                  {String(Math.floor(previewElapsed / 60)).padStart(2, '0')}:{String(previewElapsed % 60).padStart(2, '0')}
                </Text>
                <Text style={styles.previewStageCaption}>
                  {previewRunning ? 'A small moment, clearly held.' : 'Press once. Feel the state change.'}
                </Text>
              </View>
              <Button
                label={previewRunning ? 'End rehearsal' : `Begin ${previewExperience === 'track' ? 'tracking' : 'focus'}`}
                variant={previewRunning ? 'secondary' : 'primary'}
                onPress={() => {
                  if (previewRunning) {
                    setPreviewRunning(false);
                  } else {
                    setPreviewElapsed(0);
                    setPreviewStartedAt(Date.now());
                    setPreviewRunning(true);
                  }
                }}
                style={styles.previewStageAction}
              />
            </ImageBackground>

            <Text style={[typography.caption, { color: colors.secondaryText, textAlign: 'center', marginTop: 13 }]}>Your first selected activity will already be waiting on Today.</Text>
            <View style={styles.buttonStack}>
              <Button label="Enter my day" size="large" onPress={() => void handleFinish()} />
              <Button label="Back" variant="ghost" onPress={() => void goToStep(3)} style={{ marginTop: 8 }} />
            </View>
          </View>
        )}
      </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  openingRoot: {
    flex: 1,
    backgroundColor: '#071018',
    overflow: 'hidden',
  },
  openingArtwork: {
    flex: 1,
  },
  openingVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 12, 17, 0.20)',
  },
  openingContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  openingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newWordmark: {
    color: '#F6FBF9',
    fontFamily: Platform.select({ android: 'sans-serif-medium', web: 'Segoe UI Variable, Segoe UI, sans-serif' }),
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 6,
  },
  brandDescriptor: {
    color: 'rgba(229, 240, 237, 0.68)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.7,
    marginTop: 6,
  },
  arcMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcMarkOrbit: {
    position: 'absolute',
    width: 42,
    height: 24,
    borderTopWidth: 1.5,
    borderColor: 'rgba(232, 246, 241, 0.78)',
    borderRadius: 24,
    transform: [{ rotate: '-12deg' }],
  },
  arcMarkSun: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FDB46C',
    shadowColor: '#FDB46C',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  openingCopy: {
    paddingBottom: 4,
  },
  privatePill: {
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 112, 0.36)',
    backgroundColor: 'rgba(33, 20, 18, 0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },
  privatePillText: {
    color: '#F8D6B7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.45,
  },
  openingHeadline: {
    color: '#F8FBFA',
    fontFamily: Platform.select({ android: 'sans-serif', web: 'Segoe UI Variable Display, Segoe UI, sans-serif' }),
    fontSize: 48,
    lineHeight: 51,
    letterSpacing: -1.8,
    fontWeight: '700',
    maxWidth: 360,
  },
  openingBody: {
    color: 'rgba(232, 240, 238, 0.82)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    marginBottom: 24,
    maxWidth: 360,
  },
  openingPrimary: {
    backgroundColor: '#FFB170',
    borderRadius: 20,
    minHeight: 60,
  },
  openingSecondary: {
    minHeight: 52,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openingSecondaryText: {
    color: '#DCE9E5',
    fontSize: 15,
    fontWeight: '600',
  },
  openingFootnote: {
    color: 'rgba(220, 233, 229, 0.56)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: spacing.pageGutter,
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  stepRail: {
    height: 3,
    width: 88,
    borderRadius: 2,
    backgroundColor: 'rgba(125, 145, 139, 0.22)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  stepRailFill: {
    height: 3,
    borderRadius: 2,
  },
  onboardingTitle: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: '700',
    marginTop: 7,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityTile: {
    width: '48%',
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityGlyph: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStack: {
    marginTop: 24,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  themeOption: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: radii.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChoices: {
    flexDirection: 'row',
    gap: 10,
  },
  previewChoice: {
    flex: 1,
    minHeight: 112,
    borderWidth: 1.5,
    borderRadius: radii.control,
    padding: 14,
    justifyContent: 'center',
  },
  previewStage: {
    minHeight: 292,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginTop: 14,
    padding: 18,
    justifyContent: 'space-between',
  },
  previewStageImage: {
    borderRadius: radii.card,
  },
  previewStageVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 9, 18, 0.48)',
  },
  previewStageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewStageMeta: {
    color: 'rgba(247, 248, 252, 0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  previewLivePill: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(7, 12, 22, 0.54)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  previewLiveText: {
    color: '#F6F7FC',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  previewStageCenter: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  previewStageLabel: {
    color: '#FFBF87',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  previewStageTimer: {
    color: '#FFFFFF',
    fontSize: 58,
    lineHeight: 66,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  previewStageCaption: {
    color: 'rgba(244, 247, 250, 0.78)',
    fontSize: 13,
    marginTop: 1,
  },
  previewStageAction: {
    alignSelf: 'stretch',
  },
});
