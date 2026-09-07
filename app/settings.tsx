import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/ThemeContext';
import { useApp } from '../src/data/AppContext';
import { Button } from '../src/ui/components/Button';
import { Input } from '../src/ui/components/Input';
import { Card } from '../src/ui/components/Card';
import { AppIcon } from '../src/ui/components/AppIcon';
import { radii, spacing, typography } from '../src/ui/tokens';
import { sendTestReminder } from '../src/platform/notifications';
import { pickBackupFile, shareBackupFile } from '../src/platform/backupService';
import { validateBackupData } from '../src/domain/backup';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, preference, setPreference, reducedMotion, setReducedMotion } = useTheme();
  const { settings, updateUserSettings, repo, refresh } = useApp();

  const [nameInput, setNameInput] = useState(settings.profileName ?? '');
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveName = async () => {
    setIsSavingName(true);
    await updateUserSettings({ profileName: nameInput.trim() || null });
    setIsSavingName(false);
    Alert.alert('Settings saved', 'Display name updated.');
  };

  const handleTestReminder = async () => {
    const success = await sendTestReminder(settings);
    if (success) {
      Alert.alert('Test Sent', 'A test reminder has been scheduled.');
    } else {
      Alert.alert('Notice', 'Notifications are disabled or unavailable in this environment.');
    }
  };

  const handleExportBackup = async () => {
    if (!repo) return;
    try {
      const backup = await repo.exportAllData();
      const shared = await shareBackupFile(backup);
      if (!shared) {
        Alert.alert('Backup Export', 'Backup file generated.');
      }
    } catch (err: any) {
      Alert.alert('Export failed', err.message);
    }
  };

  const handleImportBackup = async () => {
    if (!repo) return;
    try {
      const payload = await pickBackupFile();
      if (!payload) return;

      const validation = validateBackupData(payload);
      if (!validation.isValid) {
        Alert.alert('Invalid Backup', validation.errorMessage ?? 'File corrupted.');
        return;
      }

      Alert.alert(
        'Confirm Restore',
        `Backup contains ${validation.itemCounts?.activities} activities, ${validation.itemCounts?.sessions} sessions. This will replace existing records. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              await repo.restoreAllData(payload);
              await refresh();
              Alert.alert('Success', 'Backup restored successfully.');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Import error', err.message);
    }
  };

  const handleEraseAll = () => {
    Alert.alert(
      'Erase All Data',
      'This will permanently delete all recorded sessions, priorities, and custom activities on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            if (repo) {
              await repo.clearAllData();
              await refresh();
              Alert.alert('Reset Complete', 'All data has been erased and reset to default.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.primaryText }]}>Settings</Text>
        <Button
          label="Done"
          size="small"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {/* Profile Section */}
      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 12 }]}>
          Profile
        </Text>
        <Input
          label="Display Name (optional)"
          placeholder="Beloved"
          value={nameInput}
          onChangeText={setNameInput}
          maxLength={40}
        />
        <Button
          label={isSavingName ? 'Saving...' : 'Save Name'}
          size="small"
          onPress={handleSaveName}
          style={{ alignSelf: 'flex-start' }}
        />
      </Card>

      {/* Appearance & Theme */}
      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 12 }]}>
          Appearance
        </Text>
        <Text style={[typography.caption, { color: colors.secondaryText, marginBottom: 10 }]}>
          Choose your interface theme:
        </Text>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as const).map((th) => (
            <Pressable
              key={th}
              onPress={() => {
                setPreference(th);
                updateUserSettings({ themePreference: th });
              }}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: preference === th ? colors.primaryAction : colors.surfaceRaised,
                  borderColor: preference === th ? colors.primaryAction : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  typography.metadata,
                  {
                    color: preference === th ? colors.onPrimaryAction : colors.primaryText,
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

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>Reduced Motion</Text>
            <Text style={[typography.caption, { color: colors.secondaryText }]}>
              Replaces continuous halo breathing and transitions with instant states.
            </Text>
          </View>
          <Switch
            value={reducedMotion}
            onValueChange={(val) => {
              setReducedMotion(val);
              updateUserSettings({ reducedMotion: val });
            }}
            trackColor={{ true: colors.primaryAction, false: colors.border }}
          />
        </View>
      </Card>

      {/* Reminders & Notifications */}
      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 12 }]}>
          Check-in Reminders
        </Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>
              Enable Reminders
            </Text>
            <Text style={[typography.caption, { color: colors.secondaryText }]}>
              Gentle prompts when paused or when time is untracked.
            </Text>
          </View>
          <Switch
            value={settings.remindersEnabled}
            onValueChange={(val) => updateUserSettings({ remindersEnabled: val })}
            trackColor={{ true: colors.primaryAction, false: colors.border }}
          />
        </View>

        <View style={[styles.switchRow, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>Privacy Mode</Text>
            <Text style={[typography.caption, { color: colors.secondaryText }]}>
              Hide specific activity names from lockscreen notifications.
            </Text>
          </View>
          <Switch
            value={settings.privacyMode}
            onValueChange={(val) => updateUserSettings({ privacyMode: val })}
            trackColor={{ true: colors.primaryAction, false: colors.border }}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={[typography.metadata, { color: colors.secondaryText }]}>
            QUIET HOURS: {settings.quietHoursStart} – {settings.quietHoursEnd} (No coaching alerts)
          </Text>
        </View>

        <Button
          label="Send Test Reminder"
          variant="outline"
          size="small"
          onPress={handleTestReminder}
          style={{ marginTop: 16, alignSelf: 'flex-start' }}
        />
      </Card>

      {/* Backup & Privacy */}
      <Card variant="surface" style={styles.sectionCard}>
        <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 8 }]}>
          Data & Privacy
        </Text>
        <Text style={[typography.caption, { color: colors.secondaryText, marginBottom: 16 }]}>
          VIGIL never uploads your activity data to any cloud service. All records are stored
          locally on this device. Back up your data manually below.
        </Text>

        <View style={styles.buttonStack}>
          <Button
            label="Export Backup (JSON)"
            variant="secondary"
            icon={<AppIcon name="sparkles" size={16} color={colors.primaryText} />}
            onPress={handleExportBackup}
          />
          <Button
            label="Import Backup"
            variant="outline"
            onPress={handleImportBackup}
            style={{ marginTop: 8 }}
          />
          <Button
            label="Erase All Data"
            variant="danger"
            onPress={handleEraseAll}
            style={{ marginTop: 16 }}
          />
        </View>
      </Card>

      {/* Developer / Design Checkpoint Shortcut */}
      <Card variant="subtle" style={styles.sectionCard}>
        <Text style={[typography.metadata, { color: colors.primaryAction, marginBottom: 4 }]}>
          DESIGN AUDIT
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>
          Gate D1 Isolated Preview Fixtures
        </Text>
        <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 2 }]}>
          Inspect Today idle, running, and paused visual treatments side-by-side with original mockups.
        </Text>
        <Button
          label="Open Gate D1 Fixtures"
          variant="outline"
          size="small"
          onPress={() => router.push('/preview')}
          style={{ marginTop: 12, alignSelf: 'flex-start' }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.pageGutter,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionCard: {
    marginBottom: 16,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonStack: {
    marginTop: 4,
  },
});
