import { Challenge, CircleRelationship, SharePolicy, ShareSnapshot } from '../domain/circle';

export type CircleProviderStatus = 'signed-out' | 'loading' | 'ready' | 'offline' | 'error';

export type CirclePerson = {
  id: string;
  displayName: string;
  initials: string;
  chosenStatus: 'Focusing' | 'Resting' | 'Offline';
  freshnessLabel: string;
};

export type CircleHome = {
  providerKind: 'real' | 'local-demo';
  crossDevice: boolean;
  status: CircleProviderStatus;
  owner: CirclePerson | null;
  people: CirclePerson[];
  relationships: CircleRelationship[];
  policies: SharePolicy[];
  snapshots: ShareSnapshot[];
  challenges: Challenge[];
  mutedPersonIds: string[];
  errorMessage?: string | null;
};

export interface CircleProvider {
  readonly providerKind: 'real' | 'local-demo';
  readonly crossDevice: boolean;
  getHome(): Promise<CircleHome>;
  enterDemo(displayName?: string): Promise<CircleHome>;
  updateRelationship(relationship: CircleRelationship): Promise<CircleHome>;
  updatePolicy(policy: SharePolicy): Promise<CircleHome>;
  sendEncouragement(recipientId: string, message: string): Promise<void>;
  setMuted(personId: string, muted: boolean): Promise<CircleHome>;
}
