import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockFindFirstSub,
  mockCancelSubscription,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockFindFirstSub: vi.fn(),
  mockCancelSubscription: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/prisma', () => ({
  prisma: { recurringSubscription: { findFirst: mockFindFirstSub } },
}));
vi.mock('@/lib/square/subscriptions', () => ({ cancelSubscription: mockCancelSubscription }));

import { POST } from './route';

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

function makeReq(id: string) {
  return new Request(`http://t.localhost/api/portal/subscriptions/${id}/cancel`, { method: 'POST' });
}

function makeParams(id: string) {
  return Promise.resolve({ id });
}

describe('POST /api/portal/subscriptions/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockFindFirstSub.mockResolvedValue({ id: 'sub-1' });
    mockCancelSubscription.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeReq('sub-1'), { params: makeParams('sub-1') });
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    const res = await POST(makeReq('sub-1'), { params: makeParams('sub-1') });
    expect(res.status).toBe(404);
  });

  it('returns 404 when subscription is not owned by member', async () => {
    mockFindFirstSub.mockResolvedValue(null);
    const res = await POST(makeReq('sub-999'), { params: makeParams('sub-999') });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Subscription not found');
  });

  it('returns 200 with ok: true when cancelled', async () => {
    const res = await POST(makeReq('sub-1'), { params: makeParams('sub-1') });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
