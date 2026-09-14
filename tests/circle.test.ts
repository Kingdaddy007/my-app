import { describe, expect, test } from '@jest/globals';
import {
  acceptCloseFriend,
  acceptFriendship,
  authorizeSnapshotRead,
  blockRelationship,
  buildDailyShareSnapshot,
  createDefaultSharePolicy,
  downgradeCloseFriend,
  rankChallenge,
  requestCloseFriend,
  requestFriendship,
  updateSharePolicy,
} from '../src/domain/circle';
import { LocalDemoCircleProvider } from '../src/social/localDemoProvider';

describe('Circle trust boundary', () => {
  const now = new Date('2026-09-13T09:00:00.000Z').getTime();

  test('friendship and close-friend upgrades require the other party to accept', () => {
    const requested = requestFriendship('owner', 'viewer', now);
    expect(() => acceptFriendship(requested, 'owner', now + 1)).toThrow('FRIEND_ACCEPT_NOT_ALLOWED');

    const friend = acceptFriendship(requested, 'viewer', now + 1);
    const closeRequested = requestCloseFriend(friend, 'owner', now + 2);
    expect(() => acceptCloseFriend(closeRequested, 'owner', now + 3)).toThrow('CLOSE_ACCEPT_NOT_ALLOWED');
    expect(acceptCloseFriend(closeRequested, 'viewer', now + 3).state).toBe('close-friend');
  });

  test('sensitive sharing requires explicit confirmation and remains unavailable to Friends', () => {
    const friendPolicy = createDefaultSharePolicy('owner', 'viewer', 'friend', now);
    expect(() => updateSharePolicy(friendPolicy, friendPolicy.fields.concat('activityNames'), now + 1)).toThrow(
      'SENSITIVE_CONFIRMATION_REQUIRED'
    );
    expect(() =>
      updateSharePolicy(friendPolicy, friendPolicy.fields.concat('activityNames'), now + 1, true)
    ).toThrow('FRIEND_FIELD_NOT_ALLOWED');

    const closePolicy = createDefaultSharePolicy('owner', 'viewer', 'close-friend', now);
    const expanded = updateSharePolicy(closePolicy, closePolicy.fields.concat('activityNames'), now + 1, true);
    expect(expanded.fields).toContain('activityNames');
  });

  test('authorized snapshots contain only policy-selected derived fields', () => {
    const relationship = acceptCloseFriend(
      requestCloseFriend(acceptFriendship(requestFriendship('owner', 'viewer', now), 'viewer', now + 1), 'owner', now + 2),
      'viewer',
      now + 3
    );
    const base = createDefaultSharePolicy('owner', 'viewer', 'close-friend', now);
    const policy = updateSharePolicy(base, ['status', 'activityNames'], now + 1, true);
    const snapshot = buildDailyShareSnapshot(policy, '2026-09-13', now + 2, {
      status: 'Focusing',
      activityNames: ['Study'],
      sessionWindows: ['09:00–09:45'],
      untrackedTime: '3h',
    });

    expect(snapshot.values).toEqual({ status: 'Focusing', activityNames: ['Study'] });
    expect(authorizeSnapshotRead({ relationship, policy, snapshot, viewerId: 'viewer' })).toEqual(
      snapshot.values
    );
  });

  test('non-friends, blocked viewers, stale policies, and downgraded tiers are denied', () => {
    const requested = requestFriendship('owner', 'viewer', now);
    const friend = acceptFriendship(requested, 'viewer', now + 1);
    const closeRequested = requestCloseFriend(friend, 'owner', now + 2);
    const close = acceptCloseFriend(closeRequested, 'viewer', now + 3);
    const policy = updateSharePolicy(
      createDefaultSharePolicy('owner', 'viewer', 'close-friend', now),
      ['status', 'activityNames'],
      now + 1,
      true
    );
    const snapshot = buildDailyShareSnapshot(policy, '2026-09-13', now + 2, {
      status: 'Focusing',
      activityNames: ['Study'],
    });

    expect(() => authorizeSnapshotRead({ relationship: requested, policy, snapshot, viewerId: 'viewer' })).toThrow(
      'SHARE_ACCESS_DENIED'
    );
    expect(() =>
      authorizeSnapshotRead({ relationship: blockRelationship(close, 'owner', now + 4), policy, snapshot, viewerId: 'viewer' })
    ).toThrow('SHARE_ACCESS_DENIED');
    expect(() =>
      authorizeSnapshotRead({ relationship: downgradeCloseFriend(close, 'owner', now + 4), policy, snapshot, viewerId: 'viewer' })
    ).toThrow('SHARE_ACCESS_DENIED');
    expect(() =>
      authorizeSnapshotRead({
        relationship: close,
        policy: { ...policy, revision: policy.revision + 1 },
        snapshot,
        viewerId: 'viewer',
      })
    ).toThrow('STALE_POLICY_REVISION');
  });

  test('challenge ranking is opt-in and raw minutes require one named activity', () => {
    expect(
      rankChallenge(
        {
          id: 'target-week',
          title: 'Keep the promise you set',
          metric: 'target-percent',
          startsOn: 'Monday',
          endsOn: 'Sunday',
          participantIds: ['owner', 'viewer'],
        },
        { owner: 82, viewer: 67 }
      )
    ).toEqual([
      { participantId: 'owner', value: 82, rank: 1 },
      { participantId: 'viewer', value: 67, rank: 2 },
    ]);
    expect(() =>
      rankChallenge(
        {
          id: 'unsafe-raw-hours',
          title: 'Raw hours',
          metric: 'named-activity-minutes',
          startsOn: 'Monday',
          endsOn: 'Sunday',
          participantIds: ['owner'],
        },
        { owner: 100 }
      )
    ).toThrow('NAMED_ACTIVITY_REQUIRED');
  });

  test('local provider is unmistakably a same-device demo', async () => {
    const provider = new LocalDemoCircleProvider();
    const signedOut = await provider.getHome();
    expect(signedOut.status).toBe('signed-out');
    expect(signedOut.providerKind).toBe('local-demo');
    expect(signedOut.crossDevice).toBe(false);

    const ready = await provider.enterDemo('Beloved');
    expect(ready.status).toBe('ready');
    expect(ready.owner?.displayName).toBe('Beloved');
  });
});
