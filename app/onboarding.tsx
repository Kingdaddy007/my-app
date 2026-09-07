import React, { useState } from 'react';
import {
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
import { MountainLandscape } from '../src/ui/MountainLandscape';
import { Button } from '../src/ui/components/Button';
import { Input } from '../src/ui/components/Input';
import { Card } from '../src/ui/components/Card';
import { AppIcon } from '../src/ui/components/AppIcon';
import { radii, spacing, typography } from '../src/ui/tokens';
import { ThemePreference } from '../src/domain/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, setPreference } = useTheme();
  const { activities, updateUserSettings } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nameInput, setNameInput] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>('system');
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set(activities.map((a) => a.id))
  );

  const toggleActivity = (id: string) => {
    const next = new Set(selectedActivities);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedActivities(next);
  };

  const handleFinish = async () => {
    await updateUserSettings({
      profileName: nameInput.trim() || null,
      themePreference: selectedTheme,
      hasCompletedOnboarding: true,
    });
    setPreference(selectedTheme);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.canvas }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 },
        ]}
      >
        {/* Step 1: Welcome & Philosophy */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.landscapeHero}>
              <MountainLandscape width={340} height={220} />
            </View>

            <View style={styles.brandingBox}>
              <Text style={[typography.metadata, { color: colors.primaryAction, letterSpacing: 3 }]}>
                V I G I L
              </Text>
              <Text style={[typography.greeting, { color: colors.primaryText, marginTop: 8 }]}>
                Make room for what matters.
              </Text>
              <Text style={[typography.body, { color: colors.secondaryText, marginTop: 12, lineHeight: 24 }]}>
                Track your time without pressure, noise, or surveillance. All data stays private on
                this device.
              </Text>
            </View>

            <View style={styles.buttonStack}>
              <Button
                label="Make it yours"
                size="large"
                onPress={() => setStep(2)}
              />
              <Button
                label="Skip directly to Today"
                variant="ghost"
                onPress={handleFinish}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        )}

        {/* Step 2: Name & Theme Personalization */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>
              STEP 1 OF 2 · PREFERENCES
            </Text>
            <Text style={[typography.greeting, { color: colors.primaryText, marginTop: 6 }]}>
              How should we greet you?
            </Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginTop: 6, marginBottom: 24 }]}>
              Optional. If left blank, VIGIL greets you with a warm time-of-day message.
            </Text>

            <Input
              label="Display Name (optional)"
              placeholder="e.g. Beloved, Alex"
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={40}
            />

            <Text style={[typography.metadata, { color: colors.secondaryText, marginTop: 16, marginBottom: 10 }]}>
              APPEARANCE THEME
            </Text>
            <View style={styles.themeRow}>
              {(['system', 'light', 'dark'] as const).map((th) => (
                <Pressable
                  key={th}
                  onPress={() => {
                    setSelectedTheme(th);
                    setPreference(th);
                  }}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selectedTheme === th ? colors.primaryAction : colors.surfaceRaised,
                      borderColor: selectedTheme === th ? colors.primaryAction : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.metadata,
                      {
                        color: selectedTheme === th ? colors.onPrimaryAction : colors.primaryText,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      },
                    ]}
                  >
                    {th}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.buttonStack}>
              <Button
                label="Continue"
                size="large"
                onPress={() => setStep(3)}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep(1)}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        )}

        {/* Step 3: Starter Activities */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[typography.metadata, { color: colors.primaryAction }]}>
              STEP 2 OF 2 · ACTIVITIES
            </Text>
            <Text style={[typography.greeting, { color: colors.primaryText, marginTop: 6 }]}>
              Choose starter activities
            </Text>
            <Text style={[typography.body, { color: colors.secondaryText, marginTop: 6, marginBottom: 20 }]}>
              Select what you intend to measure. You can rename, add custom, or archive them anytime.
            </Text>

            <View style={styles.activitiesList}>
              {activities.map((act) => {
                const isSelected = selectedActivities.has(act.id);
                return (
                  <Pressable
                    key={act.id}
                    onPress={() => toggleActivity(act.id)}
                    style={[
                      styles.activityItem,
                      {
                        backgroundColor: isSelected ? colors.surfaceRaised : colors.surface,
                        borderColor: isSelected ? colors.primaryAction : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.activityInfo}>
                      <AppIcon
                        name={act.iconKey}
                        size={20}
                        color={isSelected ? colors.primaryAction : colors.secondaryText}
                      />
                      <Text
                        style={[
                          typography.bodyMedium,
                          {
                            color: colors.primaryText,
                            marginLeft: 12,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {act.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          backgroundColor: isSelected ? colors.primaryAction : 'transparent',
                          borderColor: isSelected ? colors.primaryAction : colors.border,
                        },
                      ]}
                    >
                      {isSelected && <AppIcon name="check" size={14} color={colors.onPrimaryAction} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.buttonStack}>
              <Button
                label="Get Started"
                size="large"
                onPress={handleFinish}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep(2)}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  landscapeHero: {
    height: 220,
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  brandingBox: {
    marginBottom: 32,
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
    paddingVertical: 14,
    borderRadius: radii.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activitiesList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.control,
    borderWidth: 1,
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
