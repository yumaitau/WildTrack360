// Date-window resolution and capping for the safe query language.
//
// Every query is bounded to at most MAX_RANGE_DAYS (one year) BEFORE any
// database read, and an unspecified lower bound always defaults to one year
// back. This guarantees reads are always bounded in time.

import { MAX_RANGE_DAYS } from './sources';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResolvedRange {
  since: Date;
  until: Date;
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

/**
 * Resolve the effective [since, until] window, clamped so it never spans more
 * than one year. `now` is injectable for deterministic tests.
 */
export function resolveDateRange(since: string | undefined, until: string | undefined, now: Date = new Date()): ResolvedRange {
  const upper = until ? endOfDay(until) : now;
  let lower = since ? startOfDay(since) : new Date(upper.getTime() - MAX_RANGE_DAYS * DAY_MS);

  // Clamp an over-wide window down to the cap, anchored on the upper bound.
  if (upper.getTime() - lower.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    lower = new Date(upper.getTime() - MAX_RANGE_DAYS * DAY_MS);
  }

  return { since: lower, until: upper };
}

/** Format a Date as YYYY-MM-DD (UTC) for display. */
export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
