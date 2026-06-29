import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockFindFirstTier,
  mockCreateRecurringSubscription,
  mockTotalWithCoveredFees,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockFindFirstTier: vi.fn(),
  mockCreateRecurringSubscription: vi.fn(),
  mockTotalWithCoveredFees: vi.fn((n: number) => n),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/prisma', () => ({
  prisma: { membershipTier: { findFirst: mockFindFirstTier } },
}));
vi.mock('@/lib/square/subscriptions', () => ({
  createRecurringSubscription: mockCreateRecurringSubscription,
}));
vi.mock('@/lib/fees', () => ({ totalWithCoveredFees: mockTotalWithCoveredFees }));

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

const baseTier = {
  id: 'tier-1',
  name: 'Standard',
  amountCents: 5000,
  currency: 'AUD',
};

const baseResult = {
  subscriptionId: 'sub-1',
  status: 'ACTIVE',
  firstPaymentId: 'pay-1',
  receiptNumber: null,
};

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/portal/checkout/membership', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/checkout/membership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockFindFirstTier.mockResolvedValue(baseTier);
    mockCreateRecurringSubscription.mockResolvedValue(baseResult);
    mockTotalWithCoveredFees.mockImplementation((n: number) => n);
  });

  it('returns 400 when tierId is missing (Zod validation)', async () => {
    const res = await POST(postReq({ sourceId: 'nonce-1' }));
    expect(res.status).toBe(400);
    expect(mockCreateRecurringSubscription).not.toHaveBeenCalled();
  });

  it('returns 400 when sourceId is missing (Zod validation)', async () => {
    const res = await POST(postReq({ tierId: 'tier-1' }));
    expect(res.status).toBe(400);
    expect(mockCreateRecurringSubscription).not.toHaveBeenCalled();
  });

  it('returns 404 when tier is not found', async () => {
    mockFindFirstTier.mockResolvedValue(null);
    const res = await POST(postReq({ tierId: 'tier-999', sourceId: 'nonce-1' }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Tier not found');
  });

  it('returns 200 with schema-valid subscription result', async () => {
    const res = await POST(postReq({ tierId: 'tier-1', sourceId: 'nonce-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscriptionId).toBe('sub-1');
    expect(body.receiptNumber).toBeNull();
  });
});
