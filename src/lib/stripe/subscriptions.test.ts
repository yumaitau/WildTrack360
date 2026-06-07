import { describe, expect, it } from 'vitest';
import { computeMembershipEnd } from './subscriptions';

describe('computeMembershipEnd', () => {
  const start = new Date('2026-06-07T00:00:00.000Z');

  it('adds 1 month for MONTHLY', () => {
    const end = computeMembershipEnd(start, 'MONTHLY');
    expect(end.toISOString()).toBe('2026-07-07T00:00:00.000Z');
  });

  it('adds 1 year for ANNUAL', () => {
    const end = computeMembershipEnd(start, 'ANNUAL');
    expect(end.toISOString()).toBe('2027-06-07T00:00:00.000Z');
  });

  it('treats ONE_OFF as a 1-year grant', () => {
    const end = computeMembershipEnd(start, 'ONE_OFF');
    expect(end.toISOString()).toBe('2027-06-07T00:00:00.000Z');
  });

  it('grants 100 years for LIFETIME', () => {
    const end = computeMembershipEnd(start, 'LIFETIME');
    expect(end.toISOString()).toBe('2126-06-07T00:00:00.000Z');
  });

  it('does not mutate the input', () => {
    const before = start.toISOString();
    computeMembershipEnd(start, 'ANNUAL');
    expect(start.toISOString()).toBe(before);
  });
});
