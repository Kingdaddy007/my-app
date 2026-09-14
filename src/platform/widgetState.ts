import { LivingDayPhase } from '../domain/dayState';

/**
 * Android widget state contract. The home-screen widget renders only this
 * snapshot; it never owns timer truth and never writes sessions.
 *
 * Status: contract only. No native AppWidget provider, widget UI, or
 * installed home-screen widget ships in this build — that requires an
 * Android development build with a native widget module plus on-device
 * verification, none of which exists in this environment. Do not present
 * this file as a working widget.
 */
export type AeviaWidgetState = {
  phase: LivingDayPhase;
  activityName: string | null;
  experience: 'track' | 'focus' | null;
  elapsedActiveMs: number;
  remainingMs: number;
  overtimeMs: number;
  sleeping: boolean;
  updatedAtMs: number;
  deepLink: string;
};

export function buildWidgetState(input: {
  phase: LivingDayPhase;
  activityName: string | null;
  experience: 'track' | 'focus' | null;
  elapsedActiveMs: number;
  remainingMs: number;
  overtimeMs: number;
  sleeping: boolean;
  nowMs: number;
}): AeviaWidgetState {
  return {
    phase: input.phase,
    activityName: input.activityName,
    experience: input.experience,
    elapsedActiveMs: Math.max(0, input.elapsedActiveMs),
    remainingMs: Math.max(0, input.remainingMs),
    overtimeMs: Math.max(0, input.overtimeMs),
    sleeping: input.sleeping,
    updatedAtMs: input.nowMs,
    deepLink: input.sleeping ? 'vigil://today?state=sleep' : 'vigil://today',
  };
}

export function widgetAccessibilityLabel(state: AeviaWidgetState): string {
  if (state.phase === 'sleeping') return 'AEVIA: sleeping. Tap to open the wake control.';
  if (state.phase === 'running') {
    return `AEVIA: ${state.experience === 'focus' ? 'focus' : 'track'} running${state.activityName ? `, ${state.activityName}` : ''}. Tap to open controls.`;
  }
  if (state.phase === 'paused') return 'AEVIA: session paused. Tap to resume or finish.';
  return 'AEVIA: idle. Tap to start track or focus.';
}
