import type { CommunityEmailFrequency } from '@prisma/client';

export type ResolvedFrequency = 'OFF' | 'IMMEDIATE' | 'DAILY' | 'WEEKLY';

// Merges the profile-level master switch with an optional per-target override.
// A muted override wins (OFF); a null override inherits the master; the master
// switch being off disables everything regardless of the override.
export function resolveEmailFrequency(
  master: { emailEnabled: boolean; frequency: CommunityEmailFrequency },
  override: { emailFrequency: CommunityEmailFrequency | null; muted: boolean } | null
): ResolvedFrequency {
  if (!master.emailEnabled) return 'OFF';
  if (override) {
    if (override.muted) return 'OFF';
    if (override.emailFrequency != null) return override.emailFrequency;
  }
  return master.frequency;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function localHourWeekday(now: Date, timezone: string): { hour: number; weekday: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
    }).formatToParts(now);
    let hour = 0;
    let weekday = 0;
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
      if (p.type === 'weekday') weekday = WEEKDAY_INDEX[p.value] ?? 0;
    }
    return { hour, weekday };
  } catch {
    return { hour: now.getUTCHours(), weekday: now.getUTCDay() };
  }
}

// True when the current local hour in the preference's timezone matches
// digestHour (and, for WEEKLY, the local weekday matches digestDay). The cron
// runs hourly, so this is the once-a-period gate.
export function isDigestDue(
  pref: {
    frequency: CommunityEmailFrequency;
    timezone: string;
    digestDay: number;
    digestHour: number;
  },
  now: Date
): boolean {
  if (pref.frequency !== 'DAILY' && pref.frequency !== 'WEEKLY') return false;
  const { hour, weekday } = localHourWeekday(now, pref.timezone);
  if (hour !== pref.digestHour) return false;
  if (pref.frequency === 'WEEKLY' && weekday !== pref.digestDay) return false;
  return true;
}

// Local calendar day (YYYY-MM-DD) in the given timezone, for dedupe keys.
export function digestDayKey(now: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const m = parts.find((p) => p.type === 'month')?.value ?? '00';
    const d = parts.find((p) => p.type === 'day')?.value ?? '00';
    return `${y}-${m}-${d}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
