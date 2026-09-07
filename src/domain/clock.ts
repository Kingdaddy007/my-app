/**
 * Clock abstraction for deterministic time injection in tests and production.
 */

export interface IClock {
  now(): number; // UTC ms
}

export class SystemClock implements IClock {
  now(): number {
    return Date.now();
  }
}

export class TestClock implements IClock {
  private currentTime: number;

  constructor(initialTimeMs: number = Date.now()) {
    this.currentTime = initialTimeMs;
  }

  now(): number {
    return this.currentTime;
  }

  setTime(timeMs: number): void {
    this.currentTime = timeMs;
  }

  advance(ms: number): void {
    this.currentTime += ms;
  }
}
