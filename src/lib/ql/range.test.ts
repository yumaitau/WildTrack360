import { describe, it, expect } from 'vitest';
import { resolveDateRange, formatDay } from './range';
import { MAX_RANGE_DAYS } from './sources';

const NOW = new Date('2025-06-01T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('resolveDateRange', () => {
  it('defaults to the trailing one-year window when nothing is given', () => {
    const { since, until } = resolveDateRange(undefined, undefined, NOW);
    expect(until).toEqual(NOW);
    const spanDays = (until.getTime() - since.getTime()) / DAY_MS;
    expect(spanDays).toBeCloseTo(MAX_RANGE_DAYS, 5);
  });

  it('honours an explicit window inside the cap', () => {
    const { since, until } = resolveDateRange('2025-01-01', '2025-03-01', NOW);
    expect(formatDay(since)).toBe('2025-01-01');
    expect(formatDay(until)).toBe('2025-03-01');
  });

  it('clamps an over-wide window to one year, anchored on the upper bound', () => {
    const { since, until } = resolveDateRange('2020-01-01', '2025-01-01', NOW);
    expect(formatDay(until)).toBe('2025-01-01');
    const spanDays = (until.getTime() - since.getTime()) / DAY_MS;
    expect(spanDays).toBeLessThanOrEqual(MAX_RANGE_DAYS + 0.001);
    expect(spanDays).toBeGreaterThan(MAX_RANGE_DAYS - 1);
  });

  it('defaults the lower bound to one year before an explicit until', () => {
    const { since, until } = resolveDateRange(undefined, '2025-01-01', NOW);
    expect(formatDay(until)).toBe('2025-01-01');
    const spanDays = (until.getTime() - since.getTime()) / DAY_MS;
    expect(spanDays).toBeCloseTo(MAX_RANGE_DAYS, 1);
  });
});
