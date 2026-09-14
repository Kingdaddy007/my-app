import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { Input } from '../src/ui/components/Input';
import { AppIcon } from '../src/ui/components/AppIcon';
import { ModalSheet } from '../src/ui/components/ModalSheet';
import { radii, spacing, typography } from '../src/ui/tokens';
import { Activity } from '../src/domain/types';

export default function ActivitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { activities, categories, repo, refresh } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id ?? 'cat-focused');
  const [targetMinsInput, setTargetMinsInput] = useState('25');
  const [archivedActivities, setArchivedActivities] = useState<Activity[]>([]);

  // Archived starters (e.g. skipped during onboarding) are recoverable here.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!repo) return;
      try {
        const all = await repo.getActivities(true);
        if (mounted) setArchivedActivities(all.filter((a) => a.isArchived));
      } catch {
        // Best-effort only.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [repo, activities]);

  const filtered = activities.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleFavorite = async (act: Activity) => {
    if (!repo) return;
    act.isFavorite = !act.isFavorite;
    act.updatedAt = Date.now();
    await repo.saveActivity(act);
    await refresh();
  };

  const handleArchive = async (act: Activity) => {
    if (!repo) return;
    Alert.alert('Archive Activity', `Archive ${act.name}? Past history will be preserved.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await repo.archiveActivity(act.id);
          await refresh();
        },
      },
    ]);
  };

  const handleCreateActivity = async () => {
    const trimmed = newActivityName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter an activity name (1–60 characters).');
      return;
    }
    if (trimmed.length > 60) {
      Alert.alert('Name too long', 'Activity names must be 60 characters or fewer.');
      return;
    }

    if (!repo) return;

    const targetSec = parseInt(targetMinsInput, 10) > 0
      ? parseInt(targetMinsInput, 10) * 60
      : null;

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      name: trimmed,
      iconKey: 'sparkles',
      categoryId: selectedCategory,
      isFavorite: false,
      isArchived: false,
      targetSeconds: targetSec,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await repo.saveActivity(newAct);
    await refresh();
    setNewActivityName('');
    setIsAddModalOpen(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[typography.title, { color: colors.primaryText }]}>
              Manage Activities
            </Text>
            <Text style={[typography.caption, { color: colors.secondaryText }]}>
              Customize your tracking categories and favorites.
            </Text>
          </View>
          <Button label="Done" size="small" variant="ghost" onPress={() => router.back()} />
        </View>

        {/* Search & Add Bar */}
        <View style={styles.actionRow}>
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1 }}
          />
          <Button
            label="+ Custom"
            size="small"
            onPress={() => setIsAddModalOpen(true)}
            style={{ marginLeft: 8, height: 48 }}
          />
        </View>

        {/* Activities List */}
        <View style={styles.listContainer}>
          {filtered.map((act) => {
            const cat = categories.find((c) => c.id === act.categoryId);
            return (
              <Card key={act.id} variant="surface" padding={14} style={styles.activityCard}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconBox, { backgroundColor: colors.actionSubtle }]}>
                    <AppIcon name={act.iconKey} size={18} color={cat?.color ?? colors.primaryAction} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[typography.bodyMedium, { color: colors.primaryText, fontWeight: '600' }]}>
                      {act.name}
                    </Text>
                    <Text style={[typography.metadata, { color: colors.secondaryText }]}>
                      {cat?.name ?? 'Category'} · {act.targetSeconds ? `${Math.round(act.targetSeconds / 60)}m target` : 'Open stopwatch'}
                    </Text>
                  </View>

                  {/* Favorite toggle */}
                  <Pressable
                    onPress={() => handleToggleFavorite(act)}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel={act.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <AppIcon
                      name={act.isFavorite ? 'heart' : 'heart'}
                      size={20}
                      color={act.isFavorite ? colors.primaryAction : colors.mutedText}
                    />
                  </Pressable>

                  {/* Archive button */}
                  <Pressable
                    onPress={() => handleArchive(act)}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Archive activity"
                  >
                    <AppIcon name="close" size={18} color={colors.mutedText} />
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Archived activities: visible recovery, history preserved */}
        {archivedActivities.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Text style={[typography.sectionTitle, { color: colors.primaryText, marginBottom: 4 }]}>
              Archived
            </Text>
            <Text style={[typography.caption, { color: colors.secondaryText, marginBottom: 10 }]}>
              Past history is preserved. Restore anything you still want.
            </Text>
            {archivedActivities
              .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((act) => (
                <Card key={act.id} variant="subtle" padding={14} style={{ marginBottom: 8 }}>
                  <View style={styles.cardRow}>
                    <View style={[styles.iconBox, { backgroundColor: colors.surfaceRaised }]}>
                      <AppIcon name={act.iconKey} size={18} color={colors.mutedText} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[typography.bodyMedium, { color: colors.secondaryText }]}>
                        {act.name}
                      </Text>
                    </View>
                    <Button
                      label="Restore"
                      size="small"
                      variant="outline"
                      onPress={async () => {
                        if (!repo) return;
                        await repo.unarchiveActivity(act.id);
                        await refresh();
                      }}
                    />
                  </View>
                </Card>
              ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Create Activity Modal */}
      <ModalSheet
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="New Custom Activity"
      >
        <Input
          label="Activity Name"
          placeholder="e.g. Scripture Reading, Piano"
          value={newActivityName}
          onChangeText={setNewActivityName}
          maxLength={60}
        />

        <Input
          label="Optional Target Duration (minutes)"
          placeholder="25"
          value={targetMinsInput}
          onChangeText={setTargetMinsInput}
          keyboardType="number-pad"
        />

        <Text style={[typography.metadata, { color: colors.secondaryText, marginBottom: 8 }]}>
          CATEGORY
        </Text>
        <View style={styles.categoryRow}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setSelectedCategory(c.id)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === c.id ? colors.primaryAction : colors.surfaceRaised,
                  borderColor: selectedCategory === c.id ? colors.primaryAction : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: selectedCategory === c.id ? colors.onPrimaryAction : colors.primaryText,
                    fontWeight: '600',
                  },
                ]}
              >
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          label="Save Activity"
          size="large"
          onPress={handleCreateActivity}
          style={{ marginTop: 20 }}
        />
      </ModalSheet>
    </View>
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
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  listContainer: {
    gap: 10,
  },
  activityCard: {
    borderRadius: radii.control,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
