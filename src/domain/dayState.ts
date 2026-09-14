import { Interval, Session } from './types';
import { TimeEngine } from './timeEngine';

/**
 * Durable app/day presentation state. Mutually exclusive by construction:
 * exactly one of idle | running | paused | sleeping is true, derived from
 * the canonical Session/Interval truth — never from local UI flags.
 */
export type LivingDayPhase = 'idle' | 'running' | 'paused' | 'sleeping';

export type LivingDayState = {
  phase: LivingDayPhase;
  session: Session | null;
  openInterval: Interval | null;
  elapsedActiveMs: number;
  elapsedPauseMs: number;
  elapsedSleepMs: number;
  totalElapsedMs: number;
  sleeping: boolean;
  focusTargetMs: number | null;
  focusReached: boolean;
  overtimeMs: number;
  remainingMs: number;
  /** Day Arc progress 0..1 across the local day elapsed span. */
  dayArcProgress: number;
};

export function deriveLivingDayState(input: {
  session: Session | null;
  openInterval: Interval | null;
  elapsedActiveMs: number;
  elapsedPauseMs: number;
  elapsedSleepMs?: number;
  totalElapsedMs: number;
  dayStartMs: number;
  dayEndMs: number;
  nowMs: number;
}): LivingDayState {
  const {
    session,
    openInterval,
    elapsedActiveMs,
    elapsedPauseMs,
    elapsedSleepMs = 0,
    totalElapsedMs,
    dayStartMs,
    dayEndMs,
    nowMs,
  } = input;
  const sleeping = openInterval?.kind === 'sleep';
  let phase: LivingDayPhase = 'idle';
  if (session && sleeping) phase = 'sleeping';
  else if (session?.status === 'running') phase = 'running';
  else if (session?.status === 'paused') phase = 'paused';

  const focus = TimeEngine.focusTargetState(session, elapsedActiveMs);
  const span = Math.max(1, dayEndMs - dayStartMs);
  const dayArcProgress = Math.min(1, Math.max(0, (nowMs - dayStartMs) / span));

  return {
    phase,
    session,
    openInterval,
    elapsedActiveMs,
    elapsedPauseMs,
    elapsedSleepMs,
    totalElapsedMs,
    sleeping,
    focusTargetMs: focus.targetMs,
    focusReached: focus.reached,
    overtimeMs: focus.overtimeMs,
    remainingMs: focus.remainingMs,
    dayArcProgress,
  };
}

export function formatLivingDuration(totalMs: number): string {
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatSleptSummary(sleptMs: number): string {
  if (sleptMs > 0 && sleptMs < 60000) return 'Less than a minute of sleep recorded';
  const h = Math.floor(sleptMs / 3600000);
  const m = Math.round((sleptMs % 3600000) / 60000);
  if (h <= 0) return `${m} min of sleep recorded`;
  return `${h}h ${m}m of sleep recorded`;
}
