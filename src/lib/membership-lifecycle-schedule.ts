// Pure scheduling logic for the membership lifecycle sweep. Kept free of
// 'server-only' / prisma imports so it can be unit-tested directly.
import type { MembershipNotificationKind } from '@prisma/client';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Days until a future date, rounded up (a period ending in 12 hours = 1 day).
export function daysUntil(now: Date, target: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
}

// Days since a past date, rounded down.
export function daysSince(now: Date, target: Date): number {
  return Math.floor((now.getTime() - target.getTime()) / DAY_MS);
}

// Which renewal reminder (if any) is due for an active membership expiring on
// periodEnd. Exactly one tier fires per run; dedupe stops repeats.
export function renewalKindFor(now: Date, periodEnd: Date): MembershipNotificationKind | null {
  const left = daysUntil(now, periodEnd);
  if (left <= 0) return null; // already expired — handled by lapse/win-back
  if (left <= 1) return 'RENEWAL_1';
  if (left <= 7) return 'RENEWAL_7';
  if (left <= 30) return 'RENEWAL_30';
  return null;
}

// Which win-back (if any) is due for a membership that expired on periodEnd.
// Windows are bounded so a first-ever run doesn't email long-lapsed members.
export function winbackKindFor(now: Date, periodEnd: Date): MembershipNotificationKind | null {
  const since = daysSince(now, periodEnd);
  if (since >= 90 && since < 120) return 'WINBACK_90';
  if (since >= 30 && since < 60) return 'WINBACK_30';
  return null;
}

export const LAPSE_NOTICE_MAX_DAYS = 45;
