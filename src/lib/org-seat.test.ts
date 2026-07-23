import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  orgFeatureFlag: { findUnique: vi.fn() },
  orgMember: { count: vi.fn() },
}));

vi.mock('./prisma', () => ({ prisma: mockPrisma }));

import {
  DEFAULT_ORG_SEAT_LIMIT,
  OrgSeatLimitError,
  assertOrgSeatAvailable,
  getOrgSeatLimit,
  getOrgSeatUsage,
} from './org-seat';

describe('organisation seat limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue(null);
    mockPrisma.orgMember.count.mockResolvedValue(0);
  });

  it('defaults to 20 when ORG_SEAT is absent', async () => {
    await expect(getOrgSeatLimit('org_1')).resolves.toBe(DEFAULT_ORG_SEAT_LIMIT);
  });

  it('uses the enabled per-org ORG_SEAT integer', async () => {
    mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue({
      enabled: true,
      valueInt: 75,
    });
    await expect(getOrgSeatLimit('org_1')).resolves.toBe(75);
  });

  it.each([
    { enabled: false, valueInt: 75 },
    { enabled: true, valueInt: null },
    { enabled: true, valueInt: 0 },
    { enabled: true, valueInt: 10_001 },
  ])('falls back safely for invalid configuration %#', async (flag) => {
    mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue(flag);
    await expect(getOrgSeatLimit('org_1')).resolves.toBe(DEFAULT_ORG_SEAT_LIMIT);
  });

  it('reports pending and active OrgMember rows as used seats', async () => {
    mockPrisma.orgFeatureFlag.findUnique.mockResolvedValue({
      enabled: true,
      valueInt: 50,
    });
    mockPrisma.orgMember.count.mockResolvedValue(23);

    await expect(getOrgSeatUsage('org_1')).resolves.toEqual({
      limit: 50,
      used: 23,
      remaining: 27,
    });
  });

  it('rejects a reservation when the limit is reached', () => {
    expect(() => assertOrgSeatAvailable(20, 20)).toThrow(OrgSeatLimitError);
    expect(() => assertOrgSeatAvailable(20, 19)).not.toThrow();
  });
});
