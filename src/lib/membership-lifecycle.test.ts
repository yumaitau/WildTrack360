import { describe, expect, it } from 'vitest';
import { DAY_MS, daysSince, daysUntil, renewalKindFor, winbackKindFor } from './membership-lifecycle-schedule';

const now = new Date('2026-06-14T00:00:00.000Z');
const inDays = (n: number) => new Date(now.getTime() + n * DAY_MS);
const agoDays = (n: number) => new Date(now.getTime() - n * DAY_MS);

describe('daysUntil / daysSince', () => {
  it('rounds days-until up (a part-day still counts)', () => {
    expect(daysUntil(now, new Date(now.getTime() + 12 * 60 * 60 * 1000))).toBe(1);
    expect(daysUntil(now, inDays(30))).toBe(30);
  });

  it('rounds days-since down', () => {
    expect(daysSince(now, new Date(now.getTime() - 12 * 60 * 60 * 1000))).toBe(0);
    expect(daysSince(now, agoDays(31))).toBe(31);
  });
});

describe('renewalKindFor', () => {
  it('picks the most urgent tier within its window', () => {
    expect(renewalKindFor(now, inDays(30))).toBe('RENEWAL_30');
    expect(renewalKindFor(now, inDays(8))).toBe('RENEWAL_30');
    expect(renewalKindFor(now, inDays(7))).toBe('RENEWAL_7');
    expect(renewalKindFor(now, inDays(2))).toBe('RENEWAL_7');
    expect(renewalKindFor(now, inDays(1))).toBe('RENEWAL_1');
  });

  it('returns null outside the 30-day window or once expired', () => {
    expect(renewalKindFor(now, inDays(31))).toBeNull();
    expect(renewalKindFor(now, agoDays(1))).toBeNull();
    expect(renewalKindFor(now, now)).toBeNull();
  });
});

describe('winbackKindFor', () => {
  it('fires WINBACK_30 in the 30–59 day window', () => {
    expect(winbackKindFor(now, agoDays(30))).toBe('WINBACK_30');
    expect(winbackKindFor(now, agoDays(59))).toBe('WINBACK_30');
  });

  it('fires WINBACK_90 in the 90–119 day window', () => {
    expect(winbackKindFor(now, agoDays(90))).toBe('WINBACK_90');
    expect(winbackKindFor(now, agoDays(119))).toBe('WINBACK_90');
  });

  it('stays quiet between and outside the windows (no spamming old lapses)', () => {
    expect(winbackKindFor(now, agoDays(29))).toBeNull();
    expect(winbackKindFor(now, agoDays(60))).toBeNull();
    expect(winbackKindFor(now, agoDays(89))).toBeNull();
    expect(winbackKindFor(now, agoDays(200))).toBeNull();
  });
});
