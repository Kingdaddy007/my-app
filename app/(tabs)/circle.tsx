import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  acceptCloseFriend,
  acceptFriendship,
  authorizeSnapshotRead,
  blockRelationship,
  cancelFriendshipRequest,
  createDefaultSharePolicy,
  declineFriendship,
  describeSharePreview,
  downgradeCloseFriend,
  humanizeShareField,
  rankChallenge,
  relationshipTier,
  requestCloseFriend,
  ShareField,
  SharePolicy,
  SENSITIVE_SHARE_FIELDS,
  unblockRelationship,
  unfriend,
  updateSharePolicy,
} from '../../src/domain/circle';
import { LocalDemoCircleProvider } from '../../src/social/localDemoProvider';
import { CircleHome, CirclePerson } from '../../src/social/provider';
import { useApp } from '../../src/data/AppContext';
import { ActiveSessionBar } from '../../src/ui/ActiveSessionBar';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { ModalSheet } from '../../src/ui/components/ModalSheet';
import { useTheme } from '../../src/ui/ThemeContext';
import { radii, spacing, typography } from '../../src/ui/tokens';

const demoProvider = new LocalDemoCircleProvider();
const SHARE_CHOICES: ShareField[] = [
  'status',
  'categoryTotals',
  'sessionCount',
  'focusProgress',
  'intentions',
  'activityNames',
  'sessionWindows',
  'interruptionCount',
  'pauseReasons',
  'untrackedTime',
  'sleepSummary',
  'spiritualSummary',
];

export default function CircleScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings } = useApp();
  const [home, setHome] = useState<CircleHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('demo-samuel');
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingSensitiveField, setPendingSensitiveField] = useState<ShareField | null>(null);
  const [pendingBlock, setPendingBlock] = useState(false);

  useEffect(() => {
    demoProvider
      .getHome()
      .then(setHome)
      .catch((error) =>
        setHome({
          providerKind: 'local-demo',
          crossDevice: false,
          status: 'error',
          owner: null,
          people: [],
          relationships: [],
          policies: [],
          snapshots: [],
          challenges: [],
          mutedPersonIds: [],
          errorMessage: error instanceof Error ? error.message : 'Circle could not load.',
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const selected = home?.people.find((person) => person.id === selectedId) ?? null;
  const relationship = home?.relationships.find(
    (item) => item.requesterId === selectedId || item.recipientId === selectedId
  );
  const policy = home?.policies.find((item) => item.viewerId === selectedId);
  const tier = relationship ? relationshipTier(relationship) : null;

  const viewerPreview = useMemo(() => {
    if (!home || !selected || !relationship || !policy) return 'No private data is shared in this state.';
    const snapshot = home.snapshots.find(
      (item) => item.ownerId === policy.ownerId && item.viewerId === selected.id
    );
    if (!snapshot) return describeSharePreview(policy, selected.displayName);
    try {
      const values = authorizeSnapshotRead({ relationship, policy, snapshot, viewerId: selected.id });
      const visible = Object.keys(values) as ShareField[];
      return visible.length
        ? `${selected.displayName} can see: ${visible.map(humanizeShareField).join(', ')}.`
        : `${selected.displayName} cannot see any daily fields.`;
    } catch {
      return `${selected.displayName} cannot read this snapshot in the current relationship state.`;
    }
  }, [home, policy, relationship, selected]);

  const run = async (action: () => Promise<CircleHome>, success?: string) => {
    try {
      setHome(await action());
      setNotice(success ?? null);
    } catch (error) {
      Alert.alert('Circle action unavailable', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const updateRelationship = async (action: 'accept' | 'decline' | 'cancel' | 'close' | 'downgrade' | 'unfriend' | 'block' | 'unblock') => {
    if (!home?.owner || !relationship) return;
    const now = Date.now();
    let next = relationship;
    if (action === 'accept') next = acceptFriendship(relationship, home.owner.id, now);
    if (action === 'decline') next = declineFriendship(relationship, home.owner.id, now);
    if (action === 'cancel') next = cancelFriendshipRequest(relationship, home.owner.id, now);
    if (action === 'unblock') next = unblockRelationship(relationship, home.owner.id, now);
    if (action === 'close') {
      next =
        relationship.state === 'close-requested' && relationship.closeRequestedBy !== home.owner.id
          ? acceptCloseFriend(relationship, home.owner.id, now)
          : requestCloseFriend(relationship, home.owner.id, now);
    }
    if (action === 'downgrade') next = downgradeCloseFriend(relationship, home.owner.id, now);
    if (action === 'unfriend') next = unfriend(relationship, home.owner.id, now);
    if (action === 'block') next = blockRelationship(relationship, home.owner.id, now);
    await run(() => demoProvider.updateRelationship(next), 'Relationship updated on this device.');
  };

  const setField = async (field: ShareField, enabled: boolean, confirmed = false) => {
    if (!home?.owner || !selected || !tier) return;
    const currentPolicy: SharePolicy =
      policy ?? createDefaultSharePolicy(home.owner.id, selected.id, tier, Date.now());
    const fields = enabled
      ? currentPolicy.fields.concat(field)
      : currentPolicy.fields.filter((item) => item !== field);
    if (enabled && SENSITIVE_SHARE_FIELDS.has(field) && !confirmed) {
      setPendingSensitiveField(field);
      return;
    }
    try {
      const next = updateSharePolicy(currentPolicy, fields, Date.now(), confirmed);
      await run(() => demoProvider.updatePolicy(next), 'Your viewer preview is updated.');
    } catch (error) {
      Alert.alert(
        'This field stays private',
        error instanceof Error && error.message === 'FRIEND_FIELD_NOT_ALLOWED'
          ? 'Move to Close Friends together before enabling this detail.'
          : error instanceof Error
          ? error.message
          : 'This field could not be changed.'
      );
    }
  };

  if (loading || !home) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
        <Text style={[typography.body, { color: colors.secondaryText }]}>Opening your Circle…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100, paddingHorizontal: 20 }}
    >
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.metadata, { color: colors.primaryAction }]}>PRIVATE SUPPORT SPACE</Text>
          <Text style={[typography.greeting, { color: colors.primaryText, marginTop: 4 }]}>Your Circle</Text>
          <Text style={[typography.body, { color: colors.secondaryText, marginTop: 6 }]}>Share less by default. Encourage without watching.</Text>
        </View>
        <View style={[styles.orbitIcon, { backgroundColor: colors.actionSubtle }]}>
          <AppIcon name="people" size={26} color={colors.primaryAction} />
        </View>
      </View>

      <ActiveSessionBar />

      <View style={[styles.demoBanner, { backgroundColor: colors.warmGapSurface, borderColor: colors.warmGapBorder }]}>
        <AppIcon name="shield" size={18} color={colors.warmGapText} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.metadata, { color: colors.warmGapText }]}>LOCAL DEMO · THIS DEVICE ONLY</Text>
          <Text style={[typography.caption, { color: colors.warmGapText, marginTop: 2 }]}>Not cross-device. No account, invitation, or personal data leaves this app.</Text>
        </View>
      </View>

      {home.status === 'error' ? (
        <Card variant="warm">
          <Text style={[typography.sectionTitle, { color: colors.warmGapText }]}>Circle is unavailable</Text>
          <Text style={[typography.body, { color: colors.warmGapText, marginTop: 6 }]}>{home.errorMessage}</Text>
        </Card>
      ) : home.status === 'signed-out' ? (
        <Card style={styles.identityCard}>
          <View style={[styles.constellation, { borderColor: colors.border }]}>
            <View style={[styles.personDot, styles.dotOne, { backgroundColor: colors.primaryAction }]} />
            <View style={[styles.personDot, styles.dotTwo, { backgroundColor: colors.amber }]} />
            <View style={[styles.personDot, styles.dotThree, { backgroundColor: colors.secondaryText }]} />
          </View>
          <Text style={[typography.title, { color: colors.primaryText }]}>Connection needs a real provider</Text>
          <Text style={[typography.body, { color: colors.secondaryText, marginTop: 8, marginBottom: 18 }]}>This build has the relationship and sharing rules, but no configured identity or sync backend. Explore a clearly labeled local scenario without pretending it connects people.</Text>
          <Button
            label="Explore local demo"
            onPress={() => void run(() => demoProvider.enterDemo(settings.profileName ?? undefined), 'Local demo started.')}
            accessibilityHint="Loads fictional people and same-device sample snapshots"
          />
        </Card>
      ) : (
        <>
          {notice ? (
            <View style={[styles.notice, { backgroundColor: colors.actionSubtle }]}>
              <Text style={[typography.caption, { color: colors.primaryText }]}>{notice}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notice" onPress={() => setNotice(null)}>
                <AppIcon name="close" size={20} color={colors.primaryText} />
              </Pressable>
            </View>
          ) : null}

          <Text style={[typography.sectionTitle, { color: colors.primaryText, marginTop: 24 }]}>People</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
            {home.people.map((person) => {
              const rel = home.relationships.find(
                (item) => item.requesterId === person.id || item.recipientId === person.id
              );
              const selectedPerson = selectedId === person.id;
              return (
                <Pressable
                  key={person.id}
                  onPress={() => setSelectedId(person.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPerson }}
                  accessibilityLabel={`${person.displayName}, ${rel?.state ?? 'not connected'}`}
                  style={[
                    styles.personCard,
                    {
                      backgroundColor: selectedPerson ? colors.actionSubtle : colors.surface,
                      borderColor: selectedPerson ? colors.primaryAction : colors.borderSubtle,
                    },
                  ]}
                >
                  <Avatar person={person} active={selectedPerson} />
                  <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>{person.displayName}</Text>
                  <Text style={[typography.metadata, { color: colors.secondaryText }]}>{rel?.state.replace('-', ' ')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selected && relationship ? (
            <Card style={{ marginTop: 16 }}>
              <View style={styles.profileHead}>
                <Avatar person={selected} active={selected.chosenStatus !== 'Offline'} large />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.title, { color: colors.primaryText }]}>{selected.displayName}</Text>
                  <Text style={[typography.caption, { color: colors.secondaryText }]}>{selected.chosenStatus} · {selected.freshnessLabel}</Text>
                </View>
              </View>

              {relationship.state === 'requested' && relationship.recipientId === home.owner?.id ? (
                <View style={{ gap: 8, marginTop: 16 }}>
                  <Button label="Accept friend request" onPress={() => void updateRelationship('accept')} />
                  <Button label="Decline" variant="outline" onPress={() => void updateRelationship('decline')} />
                </View>
              ) : relationship.state === 'requested' && relationship.requesterId === home.owner?.id ? (
                <Button label="Cancel request" variant="outline" onPress={() => void updateRelationship('cancel')} style={{ marginTop: 16 }} />
              ) : relationship.state === 'blocked' ? (
                <Button label="Unblock" variant="outline" onPress={() => void updateRelationship('unblock')} style={{ marginTop: 16 }} />
              ) : tier ? (
                <View style={styles.actionGrid}>
                  <Button
                    size="small"
                    variant="secondary"
                    label={relationship.state === 'close-friend' ? 'Close Friend' : relationship.state === 'close-requested' ? 'Close pending' : 'Request Close'}
                    disabled={relationship.state === 'close-requested' && relationship.closeRequestedBy === home.owner?.id}
                    onPress={() => void updateRelationship('close')}
                    style={styles.flexButton}
                  />
                  <Button
                    size="small"
                    variant="outline"
                    label={home.mutedPersonIds.includes(selected.id) ? 'Unmute' : 'Mute updates'}
                    onPress={() => void run(() => demoProvider.setMuted(selected.id, !home.mutedPersonIds.includes(selected.id)))}
                    style={styles.flexButton}
                  />
                  {relationship.state === 'close-friend' ? (
                    <Button size="small" variant="ghost" label="Move to Friends" onPress={() => void updateRelationship('downgrade')} style={styles.flexButton} />
                  ) : null}
                  <Button
                    size="small"
                    variant="ghost"
                    label="Send encouragement"
                    onPress={() => void run(async () => {
                      await demoProvider.sendEncouragement(selected.id, 'Thinking of you. Keep your own pace.');
                      return demoProvider.getHome();
                    }, 'A quiet demo encouragement was prepared locally.')}
                    style={styles.flexButton}
                  />
                </View>
              ) : (
                <Text style={[typography.body, { color: colors.secondaryText, marginTop: 14 }]}>No daily data is shared in this relationship state.</Text>
              )}

              {tier ? (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                  <Text style={[typography.sectionTitle, { color: colors.primaryText }]}>What {selected.displayName} may see</Text>
                  <Text style={[typography.caption, { color: colors.secondaryText, marginTop: 4 }]}>Each field is off unless your policy includes it. Sensitive fields confirm before enabling.</Text>
                  <View style={{ marginTop: 10 }}>
                    {SHARE_CHOICES.map((field) => {
                      const enabled = policy?.fields.includes(field) ?? false;
                      const sensitive = SENSITIVE_SHARE_FIELDS.has(field);
                      const restrictedToCloseFriends =
                        tier === 'friend' &&
                        !['status', 'categoryTotals', 'sessionCount', 'focusProgress', 'intentions'].includes(field);
                      return (
                        <View key={field} style={[styles.settingRow, { borderBottomColor: colors.borderSubtle }]}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>{humanizeShareField(field)}</Text>
                            {restrictedToCloseFriends ? (
                              <Text style={[typography.metadata, { color: colors.mutedText }]}>Close Friends only</Text>
                            ) : sensitive ? (
                              <Text style={[typography.metadata, { color: colors.amber }]}>Sensitive detail</Text>
                            ) : null}
                          </View>
                          <Switch
                            value={enabled}
                            disabled={restrictedToCloseFriends}
                            onValueChange={(value) => void setField(field, value)}
                            trackColor={{ false: colors.border, true: colors.primaryAction }}
                            thumbColor={colors.surface}
                            accessibilityLabel={`Share ${humanizeShareField(field)} with ${selected.displayName}`}
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={[styles.preview, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[typography.metadata, { color: colors.primaryAction }]}>PREVIEW AS {selected.displayName.toUpperCase()}</Text>
                    <Text style={[typography.body, { color: colors.primaryText, marginTop: 6 }]}>{viewerPreview}</Text>
                  </View>
                  <View style={styles.boundaryRow}>
                    <Button size="small" variant="ghost" label="Unfriend" onPress={() => void updateRelationship('unfriend')} />
                    <Button
                      size="small"
                      variant="ghost"
                      label="Block"
                      onPress={() => setPendingBlock(true)}
                    />
                  </View>
                </>
              ) : null}
            </Card>
          ) : null}

          <ChallengeCard people={home.people} />
        </>
      )}

      <ModalSheet
        visible={pendingSensitiveField != null}
        onClose={() => setPendingSensitiveField(null)}
        title="Share a sensitive detail?"
      >
        <Text style={[typography.body, { color: colors.secondaryText }]}>
          {selected && pendingSensitiveField
            ? `${selected.displayName} would see ${humanizeShareField(pendingSensitiveField)} in future daily snapshots.`
            : 'This detail stays private until you confirm.'}
        </Text>
        <View style={[styles.confirmRow, { marginTop: 18 }]}>
          <Button label="Keep private" variant="outline" onPress={() => setPendingSensitiveField(null)} style={{ flex: 1 }} />
          <Button
            label="Share detail"
            onPress={() => {
              const field = pendingSensitiveField;
              setPendingSensitiveField(null);
              if (field) void setField(field, true, true);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </ModalSheet>

      <ModalSheet visible={pendingBlock} onClose={() => setPendingBlock(false)} title="Block this person?">
        <Text style={[typography.body, { color: colors.secondaryText }]}>They immediately lose access to shared snapshots in this local demo. The provider boundary applies the same denial before any snapshot read.</Text>
        <View style={[styles.confirmRow, { marginTop: 18 }]}>
          <Button label="Cancel" variant="outline" onPress={() => setPendingBlock(false)} style={{ flex: 1 }} />
          <Button label="Block" variant="danger" onPress={() => {
            setPendingBlock(false);
            void updateRelationship('block');
          }} style={{ flex: 1 }} />
        </View>
      </ModalSheet>
    </ScrollView>
  );
}

function Avatar({ person, active, large = false }: { person: CirclePerson; active: boolean; large?: boolean }) {
  const { colors } = useTheme();
  const size = large ? 58 : 46;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceRaised, borderColor: active ? colors.primaryAction : colors.border }]}>
      <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>{person.initials}</Text>
      <View style={[styles.statusDot, { backgroundColor: active ? colors.primaryAction : colors.mutedText, borderColor: colors.surface }]} />
    </View>
  );
}

function ChallengeCard({ people }: { people: CirclePerson[] }) {
  const { colors } = useTheme();
  const participants = ['demo-owner', 'demo-samuel', 'demo-ada'];
  const ranked = rankChallenge(
    { id: 'demo', title: 'Keep the promise you set', metric: 'target-percent', startsOn: 'Monday', endsOn: 'Sunday', participantIds: participants },
    { 'demo-owner': 71, 'demo-samuel': 64, 'demo-ada': 78 }
  );
  return (
    <Card variant="raised" style={{ marginTop: 20 }}>
      <View style={styles.challengeTitle}>
        <AppIcon name="sparkles" size={20} color={colors.primaryAction} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.metadata, { color: colors.amber }]}>LOCAL DEMO FIGURES</Text>
          <Text style={[typography.sectionTitle, { color: colors.primaryText, marginTop: 2 }]}>Keep the promise you set</Text>
          <Text style={[typography.caption, { color: colors.secondaryText }]}>Opt-in · ranked by personal target %, not raw hours</Text>
        </View>
      </View>
      {ranked.map((entry) => {
        const name = entry.participantId === 'demo-owner' ? 'You' : people.find((person) => person.id === entry.participantId)?.displayName;
        return (
          <View key={entry.participantId} style={styles.rankRow}>
            <Text style={[typography.metadata, { color: colors.mutedText, width: 24 }]}>#{entry.rank}</Text>
            <Text style={[typography.bodyMedium, { color: colors.primaryText, flex: 1 }]}>{name}</Text>
            <Text style={[typography.bodyMedium, { color: colors.primaryAction }]}>{entry.value}%</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  orbitIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  demoBanner: { minHeight: 68, borderWidth: 1, borderRadius: radii.control, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 18 },
  identityCard: { overflow: 'hidden' },
  constellation: { height: 100, borderWidth: 1, borderRadius: radii.control, marginBottom: 18, position: 'relative' },
  personDot: { width: 18, height: 18, borderRadius: 9, position: 'absolute' },
  dotOne: { left: '18%', top: '48%' }, dotTwo: { left: '55%', top: '20%' }, dotThree: { right: '14%', bottom: '18%' },
  notice: { minHeight: 48, borderRadius: radii.control, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  peopleRow: { gap: 10, paddingVertical: 12, paddingRight: 10 },
  personCard: { minWidth: 112, borderWidth: 1, borderRadius: radii.control, padding: 12, gap: 7 },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, position: 'relative' },
  statusDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, right: -1, bottom: 1 },
  profileHead: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  flexButton: { flexGrow: 1 },
  divider: { height: 1, marginVertical: 20 },
  settingRow: { minHeight: spacing.touchTargetMin + 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 6 },
  preview: { borderWidth: 1, borderRadius: radii.control, padding: 14, marginTop: 16 },
  boundaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  challengeTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  rankRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmRow: { flexDirection: 'row', gap: 10 },
});
