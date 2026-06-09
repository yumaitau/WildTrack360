import { describe, expect, it } from 'vitest';
import { computeMembershipEnd, computeNextCharge } from './periods';

describe('computeMembershipEnd', () => {
  const start = new Date('2026-06-07T00:00:00.000Z');

  it('adds 1 month for MONTHLY', () => {
    expect(computeMembershipEnd(start, 'MONTHLY').toISOString()).toBe('2026-07-07T00:00:00.000Z');
  });

  it('adds 1 year for ANNUAL', () => {
    expect(computeMembershipEnd(start, 'ANNUAL').toISOString()).toBe('2027-06-07T00:00:00.000Z');
  });

  it('treats ONE_OFF as a 1-year grant', () => {
    expect(computeMembershipEnd(start, 'ONE_OFF').toISOString()).toBe('2027-06-07T00:00:00.000Z');
  });

  it('grants 100 years for LIFETIME', () => {
    expect(computeMembershipEnd(start, 'LIFETIME').toISOString()).toBe('2126-06-07T00:00:00.000Z');
  });

  it('does not mutate the input', () => {
    const before = start.toISOString();
    computeMembershipEnd(start, 'ANNUAL');
    expect(start.toISOString()).toBe(before);
  });
});

describe('computeNextCharge', () => {
  const from = new Date('2026-06-07T00:00:00.000Z');

  it('advances one month for MONTHLY', () => {
    expect(computeNextCharge(from, 'MONTHLY').toISOString()).toBe('2026-07-07T00:00:00.000Z');
  });

  it('advances one year for ANNUAL', () => {
    expect(computeNextCharge(from, 'ANNUAL').toISOString()).toBe('2027-06-07T00:00:00.000Z');
  });

  it('does not mutate the input', () => {
    const before = from.toISOString();
    computeNextCharge(from, 'MONTHLY');
    expect(from.toISOString()).toBe(before);
  });
});
