import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockFindManySubs,
  mockFindManyTiers,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockFindManySubs: vi.fn(),
  mockFindManyTiers: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    recurringSubscription: { findMany: mockFindManySubs },
    membershipTier: { findMany: mockFindManyTiers },
  },
}));

import { GET } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseMember = {
  id: 'member-1',
  clerkOrganizationId: 'org-1',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: null,
  status: 'ACTIVE' as const,
  joinedAt: D,
  clerkUserId: null,
  clerkInvitationId: null,
  carerProfileId: null,
  squareCustomerId: null,
  squareCardId: null,
  addressLine1: null,
  addressLine2: null,
  suburb: null,
  state: null,
  postcode: null,
  country: 'AU',
  memberNumber: null,
  primaryMemberId: null,
  portalInvitedAt: null,
  archivedAt: null,
  createdAt: D,
  updatedAt: D,
  customFieldsJson: {},
};

const baseSession = { member: baseMember, email: 'jane@example.org' };

const baseDonationSub = {
  id: 'sub-1',
  kind: 'DONATION',
  tierId: null,
  amountCents: 1000,
  currency: 'AUD',
  interval: 'MONTHLY',
  status: 'ACTIVE',
  nextChargeAt: D,
  startedAt: D,
  memberId: 'member-1',
};

function getReq() {
  return new Request('http://t.localhost/api/portal/subscriptions', { method: 'GET' });
}

describe('GET /api/portal/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockFindManySubs.mockResolvedValue([baseDonationSub]);
    mockFindManyTiers.mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    const res = await GET(getReq());
    expect(res.status).toBe(404);
  });

  it('returns 200 with schema-valid subscriptions (Dates as ISO strings)', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('sub-1');
    expect(body[0].label).toBe('Donation');
    expect(body[0].nextChargeAt).toBe('2026-01-01T00:00:00.000Z');
    expect(body[0].startedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
