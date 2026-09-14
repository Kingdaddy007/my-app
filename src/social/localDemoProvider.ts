import {
  buildDailyShareSnapshot,
  CircleRelationship,
  createDefaultSharePolicy,
  FRIEND_DEFAULT_FIELDS,
  ShareField,
  SharePolicy,
} from '../domain/circle';
import { CircleHome, CirclePerson, CircleProvider } from './provider';

const OWNER: CirclePerson = {
  id: 'demo-owner',
  displayName: 'You',
  initials: 'YO',
  chosenStatus: 'Focusing',
  freshnessLabel: 'On this device now',
};

const PEOPLE: CirclePerson[] = [
  { id: 'demo-samuel', displayName: 'Samuel', initials: 'SA', chosenStatus: 'Focusing', freshnessLabel: 'Demo snapshot · 8 min ago' },
  { id: 'demo-ada', displayName: 'Ada', initials: 'AD', chosenStatus: 'Resting', freshnessLabel: 'Demo snapshot · 24 min ago' },
  { id: 'demo-mira', displayName: 'Mira', initials: 'MI', chosenStatus: 'Offline', freshnessLabel: 'Demo invitation' },
];

const DEMO_DERIVED_VALUES = {
  status: 'Focusing',
  categoryTotals: ['Focus 1h 35m', 'Rest 42m'],
  sessionCount: 3,
  focusProgress: '71% of today target',
  activityNames: ['Study'],
  interruptionCount: 2,
} as const;

function initialRelationships(now: number): CircleRelationship[] {
  return [
    {
      id: 'rel:demo-owner:demo-samuel',
      requesterId: 'demo-owner',
      recipientId: 'demo-samuel',
      state: 'friend',
      closeRequestedBy: null,
      blockedBy: null,
      updatedAt: now,
    },
    {
      id: 'rel:demo-ada:demo-owner',
      requesterId: 'demo-ada',
      recipientId: 'demo-owner',
      state: 'close-friend',
      closeRequestedBy: null,
      blockedBy: null,
      updatedAt: now,
    },
    {
      id: 'rel:demo-mira:demo-owner',
      requesterId: 'demo-mira',
      recipientId: 'demo-owner',
      state: 'requested',
      closeRequestedBy: null,
      blockedBy: null,
      updatedAt: now,
    },
  ];
}

export class LocalDemoCircleProvider implements CircleProvider {
  readonly providerKind = 'local-demo' as const;
  readonly crossDevice = false;
  private home: CircleHome;

  constructor() {
    const now = Date.now();
    const relationships = initialRelationships(now);
    const policies = PEOPLE.slice(0, 2).map((person) =>
      createDefaultSharePolicy(
        OWNER.id,
        person.id,
        person.id === 'demo-ada' ? 'close-friend' : 'friend',
        now
      )
    );
    const snapshots = policies.map((policy) =>
      buildDailyShareSnapshot(policy, new Date().toISOString().slice(0, 10), now, DEMO_DERIVED_VALUES)
    );
    this.home = {
      providerKind: this.providerKind,
      crossDevice: this.crossDevice,
      status: 'signed-out',
      owner: null,
      people: PEOPLE,
      relationships,
      policies,
      snapshots,
      challenges: [
        {
          id: 'challenge-demo-week',
          title: 'Keep the promise you set',
          metric: 'target-percent',
          startsOn: 'This Monday',
          endsOn: 'Sunday',
          participantIds: ['demo-owner', 'demo-samuel', 'demo-ada'],
        },
      ],
      mutedPersonIds: [],
    };
  }

  async getHome(): Promise<CircleHome> {
    return JSON.parse(JSON.stringify(this.home)) as CircleHome;
  }

  async enterDemo(displayName?: string): Promise<CircleHome> {
    this.home = {
      ...this.home,
      status: 'ready',
      owner: { ...OWNER, displayName: displayName?.trim() || OWNER.displayName },
    };
    return this.getHome();
  }

  async updateRelationship(relationship: CircleRelationship): Promise<CircleHome> {
    // Demo-boundary guard: only the owner (or a counterparty in fixtures) may
    // move a relationship, and blocked/none transitions stay explicit. This is
    // local-demo defense in depth — a real backend must enforce server rules.
    const known = this.home.relationships.find((item) => item.id === relationship.id);
    if (!known) throw new Error('DEMO_RELATIONSHIP_NOT_FOUND');
    const ownerParty =
      relationship.requesterId === OWNER.id || relationship.recipientId === OWNER.id;
    if (!ownerParty) throw new Error('RELATIONSHIP_PARTY_REQUIRED');
    this.home = {
      ...this.home,
      relationships: this.home.relationships.map((item) =>
        item.id === relationship.id ? relationship : item
      ),
    };
    return this.getHome();
  }

  async updatePolicy(policy: SharePolicy): Promise<CircleHome> {
    // Demo-boundary guard: friend tier can never carry close-only fields, even
    // if a caller bypasses updateSharePolicy. Mirrors domain FRIEND_FIELD_CAP.
    if (policy.ownerId !== OWNER.id) throw new Error('DEMO_POLICY_OWNER_ONLY');
    if (
      policy.tier === 'friend' &&
      policy.fields.some((field) => !(FRIEND_DEFAULT_FIELDS as readonly string[]).includes(field) && field !== 'intentions')
    ) {
      throw new Error('FRIEND_FIELD_NOT_ALLOWED');
    }
    const existing = this.home.policies.some(
      (item) => item.ownerId === policy.ownerId && item.viewerId === policy.viewerId
    );
    this.home = {
      ...this.home,
      policies: existing
        ? this.home.policies.map((item) =>
            item.ownerId === policy.ownerId && item.viewerId === policy.viewerId ? policy : item
          )
        : this.home.policies.concat(policy),
      snapshots: this.home.snapshots
        .filter((snapshot) => snapshot.ownerId !== policy.ownerId || snapshot.viewerId !== policy.viewerId)
        .concat(
          buildDailyShareSnapshot(
            policy,
            new Date().toISOString().slice(0, 10),
            Date.now(),
            DEMO_DERIVED_VALUES
          )
        ),
    };
    return this.getHome();
  }

  async sendEncouragement(recipientId: string, message: string): Promise<void> {
    if (!PEOPLE.some((person) => person.id === recipientId)) throw new Error('DEMO_PERSON_NOT_FOUND');
    if (!message.trim() || message.length > 80) throw new Error('INVALID_ENCOURAGEMENT');
  }

  async setMuted(personId: string, muted: boolean): Promise<CircleHome> {
    const ids = new Set(this.home.mutedPersonIds);
    if (muted) ids.add(personId);
    else ids.delete(personId);
    this.home = { ...this.home, mutedPersonIds: Array.from(ids) };
    return this.getHome();
  }
}
