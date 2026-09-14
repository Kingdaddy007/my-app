export type CircleTier = 'friend' | 'close-friend';

export type RelationshipState =
  | 'none'
  | 'requested'
  | 'friend'
  | 'close-requested'
  | 'close-friend'
  | 'blocked';

export type CircleRelationship = {
  id: string;
  requesterId: string;
  recipientId: string;
  state: RelationshipState;
  closeRequestedBy?: string | null;
  blockedBy?: string | null;
  updatedAt: number;
};

export type ShareField =
  | 'status'
  | 'categoryTotals'
  | 'sessionCount'
  | 'focusProgress'
  | 'intentions'
  | 'activityNames'
  | 'sessionWindows'
  | 'interruptionCount'
  | 'pauseReasons'
  | 'untrackedTime'
  | 'sleepSummary'
  | 'spiritualSummary';

export type SharePolicy = {
  ownerId: string;
  viewerId: string;
  tier: CircleTier;
  fields: ShareField[];
  revision: number;
  updatedAt: number;
};

export type ShareSnapshot = {
  ownerId: string;
  viewerId: string;
  localDate: string;
  generatedAt: number;
  policyRevision: number;
  values: Partial<Record<ShareField, unknown>>;
};

export const FRIEND_DEFAULT_FIELDS: ShareField[] = [
  'status',
  'categoryTotals',
  'sessionCount',
  'focusProgress',
];

export const SENSITIVE_SHARE_FIELDS = new Set<ShareField>([
  'activityNames',
  'sessionWindows',
  'pauseReasons',
  'untrackedTime',
  'sleepSummary',
  'spiritualSummary',
]);

const FRIEND_FIELD_CAP = new Set<ShareField>(FRIEND_DEFAULT_FIELDS.concat('intentions'));

function includesParty(relationship: CircleRelationship, userId: string): boolean {
  return relationship.requesterId === userId || relationship.recipientId === userId;
}

function otherParty(relationship: CircleRelationship, userId: string): string {
  if (!includesParty(relationship, userId)) throw new Error('RELATIONSHIP_PARTY_REQUIRED');
  return relationship.requesterId === userId ? relationship.recipientId : relationship.requesterId;
}

export function requestFriendship(requesterId: string, recipientId: string, now: number): CircleRelationship {
  if (!requesterId || !recipientId || requesterId === recipientId) {
    throw new Error('INVALID_FRIEND_REQUEST');
  }
  return {
    id: `rel:${[requesterId, recipientId].sort().join(':')}`,
    requesterId,
    recipientId,
    state: 'requested',
    closeRequestedBy: null,
    blockedBy: null,
    updatedAt: now,
  };
}

export function acceptFriendship(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (relationship.state !== 'requested' || relationship.recipientId !== actorId) {
    throw new Error('FRIEND_ACCEPT_NOT_ALLOWED');
  }
  return { ...relationship, state: 'friend', updatedAt: now };
}

export function declineFriendship(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (relationship.state !== 'requested' || !includesParty(relationship, actorId)) {
    throw new Error('FRIEND_DECLINE_NOT_ALLOWED');
  }
  return { ...relationship, state: 'none', closeRequestedBy: null, updatedAt: now };
}

export function cancelFriendshipRequest(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (
    relationship.state !== 'requested' ||
    relationship.requesterId !== actorId
  ) {
    throw new Error('FRIEND_CANCEL_NOT_ALLOWED');
  }
  return { ...relationship, state: 'none', closeRequestedBy: null, updatedAt: now };
}

export function unblockRelationship(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (relationship.state !== 'blocked' || relationship.blockedBy !== actorId) {
    throw new Error('UNBLOCK_NOT_ALLOWED');
  }
  return { ...relationship, state: 'none', blockedBy: null, closeRequestedBy: null, updatedAt: now };
}

export function requestCloseFriend(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (relationship.state !== 'friend' || !includesParty(relationship, actorId)) {
    throw new Error('CLOSE_REQUEST_NOT_ALLOWED');
  }
  return { ...relationship, state: 'close-requested', closeRequestedBy: actorId, updatedAt: now };
}

export function acceptCloseFriend(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (
    relationship.state !== 'close-requested' ||
    !includesParty(relationship, actorId) ||
    relationship.closeRequestedBy === actorId
  ) {
    throw new Error('CLOSE_ACCEPT_NOT_ALLOWED');
  }
  return { ...relationship, state: 'close-friend', closeRequestedBy: null, updatedAt: now };
}

export function downgradeCloseFriend(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (!includesParty(relationship, actorId) || !['close-friend', 'close-requested'].includes(relationship.state)) {
    throw new Error('CLOSE_DOWNGRADE_NOT_ALLOWED');
  }
  return { ...relationship, state: 'friend', closeRequestedBy: null, updatedAt: now };
}

export function blockRelationship(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (!includesParty(relationship, actorId)) throw new Error('BLOCK_NOT_ALLOWED');
  return {
    ...relationship,
    state: 'blocked',
    blockedBy: actorId,
    closeRequestedBy: null,
    updatedAt: now,
  };
}

export function unfriend(
  relationship: CircleRelationship,
  actorId: string,
  now: number
): CircleRelationship {
  if (!includesParty(relationship, actorId) || relationship.state === 'blocked') {
    throw new Error('UNFRIEND_NOT_ALLOWED');
  }
  // Preserve original requester/recipient identity for audit; only state changes.
  return {
    ...relationship,
    state: 'none',
    closeRequestedBy: null,
    updatedAt: now,
  };
}

export function relationshipTier(relationship: CircleRelationship): CircleTier | null {
  if (relationship.state === 'close-friend') return 'close-friend';
  if (relationship.state === 'friend' || relationship.state === 'close-requested') return 'friend';
  return null;
}

export const CLOSE_FRIEND_DEFAULT_FIELDS: ShareField[] = [...FRIEND_DEFAULT_FIELDS, 'intentions'];

export function createDefaultSharePolicy(
  ownerId: string,
  viewerId: string,
  tier: CircleTier,
  now: number
): SharePolicy {
  return {
    ownerId,
    viewerId,
    tier,
    fields: tier === 'close-friend' ? [...CLOSE_FRIEND_DEFAULT_FIELDS] : [...FRIEND_DEFAULT_FIELDS],
    revision: 1,
    updatedAt: now,
  };
}

export function updateSharePolicy(
  policy: SharePolicy,
  fields: ShareField[],
  now: number,
  sensitiveConfirmation = false
): SharePolicy {
  const uniqueFields = Array.from(new Set(fields));
  const newlyEnabledSensitive = uniqueFields.some(
    (field) => SENSITIVE_SHARE_FIELDS.has(field) && !policy.fields.includes(field)
  );
  if (newlyEnabledSensitive && !sensitiveConfirmation) {
    throw new Error('SENSITIVE_CONFIRMATION_REQUIRED');
  }
  if (policy.tier === 'friend' && uniqueFields.some((field) => !FRIEND_FIELD_CAP.has(field))) {
    throw new Error('FRIEND_FIELD_NOT_ALLOWED');
  }
  return { ...policy, fields: uniqueFields, revision: policy.revision + 1, updatedAt: now };
}

export function buildDailyShareSnapshot(
  policy: SharePolicy,
  localDate: string,
  generatedAt: number,
  derivedValues: Partial<Record<ShareField, unknown>>
): ShareSnapshot {
  const values: Partial<Record<ShareField, unknown>> = {};
  for (const field of policy.fields) {
    if (Object.prototype.hasOwnProperty.call(derivedValues, field)) values[field] = derivedValues[field];
  }
  return {
    ownerId: policy.ownerId,
    viewerId: policy.viewerId,
    localDate,
    generatedAt,
    policyRevision: policy.revision,
    values,
  };
}

export function authorizeSnapshotRead(input: {
  relationship: CircleRelationship | null;
  policy: SharePolicy | null;
  snapshot: ShareSnapshot;
  viewerId: string;
}): Partial<Record<ShareField, unknown>> {
  const { relationship, policy, snapshot, viewerId } = input;
  if (!relationship || !policy || relationship.state === 'blocked') throw new Error('SHARE_ACCESS_DENIED');
  const tier = relationshipTier(relationship);
  if (!tier || !includesParty(relationship, viewerId) || policy.viewerId !== viewerId) {
    throw new Error('SHARE_ACCESS_DENIED');
  }
  // Bind the snapshot owner to THIS relationship: the policy owner must be
  // the relationship's other party, so an unrelated friendship can never
  // authorize another owner's snapshot.
  const otherPartyId =
    relationship.requesterId === viewerId ? relationship.recipientId : relationship.requesterId;
  if (policy.ownerId !== otherPartyId) {
    throw new Error('SHARE_ACCESS_DENIED');
  }
  if (
    policy.ownerId !== snapshot.ownerId ||
    policy.viewerId !== snapshot.viewerId ||
    snapshot.viewerId !== viewerId ||
    policy.ownerId === viewerId
  ) {
    throw new Error('SHARE_ACCESS_DENIED');
  }
  if (snapshot.policyRevision !== policy.revision) throw new Error('STALE_POLICY_REVISION');
  if (policy.tier === 'close-friend' && tier !== 'close-friend') throw new Error('SHARE_ACCESS_DENIED');

  const allowed = new Set(
    policy.fields.filter((field) => tier === 'close-friend' || FRIEND_FIELD_CAP.has(field))
  );
  const result: Partial<Record<ShareField, unknown>> = {};
  for (const [field, value] of Object.entries(snapshot.values) as Array<[ShareField, unknown]>) {
    if (allowed.has(field)) result[field] = value;
  }
  return result;
}

export function describeSharePreview(policy: SharePolicy, viewerName: string): string {
  const visible = policy.fields.length ? policy.fields.map(humanizeShareField).join(', ') : 'nothing';
  const hiddenSensitive = Array.from(SENSITIVE_SHARE_FIELDS).filter((field) => !policy.fields.includes(field));
  return `${viewerName} will see ${visible}. ${viewerName} will not see ${hiddenSensitive
    .map(humanizeShareField)
    .join(', ')}.`;
}

export function humanizeShareField(field: ShareField): string {
  const labels: Record<ShareField, string> = {
    status: 'your chosen status',
    categoryTotals: 'selected category totals',
    sessionCount: 'completed session count',
    focusProgress: 'Focus target progress',
    intentions: 'selected intentions',
    activityNames: 'exact activity names',
    sessionWindows: 'exact session times',
    interruptionCount: 'interruption count',
    pauseReasons: 'pause reasons',
    untrackedTime: 'untracked time',
    sleepSummary: 'sleep summary',
    spiritualSummary: 'spiritual summary',
  };
  return labels[field];
}

export type ChallengeMetric =
  | 'target-percent'
  | 'intentional-sessions'
  | 'return-rate'
  | 'consistency'
  | 'named-activity-minutes';

export type Challenge = {
  id: string;
  title: string;
  metric: ChallengeMetric;
  startsOn: string;
  endsOn: string;
  participantIds: string[];
  namedActivity?: string | null;
};

export function rankChallenge(
  challenge: Challenge,
  values: Record<string, number>
): Array<{ participantId: string; value: number; rank: number }> {
  if (!challenge.participantIds.length) return [];
  if (challenge.metric === 'named-activity-minutes' && !challenge.namedActivity?.trim()) {
    throw new Error('NAMED_ACTIVITY_REQUIRED');
  }
  return challenge.participantIds
    .map((participantId) => ({ participantId, value: Math.max(0, values[participantId] ?? 0) }))
    .sort((a, b) => b.value - a.value || a.participantId.localeCompare(b.participantId))
    .map((entry, index, entries) => ({
      ...entry,
      rank:
        index > 0 && entry.value === entries[index - 1].value
          ? entries.findIndex((candidate) => candidate.value === entry.value) + 1
          : index + 1,
    }));
}
