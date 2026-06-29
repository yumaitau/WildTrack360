import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockCreateRecurringSubscription,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockCreateRecurringSubscription: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/square/subscriptions', () => ({
  createRecurringSubscription: mockCreateRecurringSubscription,
}));

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

const baseResult = {
  subscriptionId: 'sub-1',
  status: 'ACTIVE',
  firstPaymentId: 'pay-1',
  receiptNumber: null,
};

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/portal/checkout/recurring-donation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/checkout/recurring-donation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockCreateRecurringSubscription.mockResolvedValue(baseResult);
  });

  it('returns 400 when amountCents is missing (Zod validation)', async () => {
    const res = await POST(postReq({ interval: 'MONTHLY', sourceId: 'nonce-1' }));
    expect(res.status).toBe(400);
    expect(mockCreateRecurringSubscription).not.toHaveBeenCalled();
  });

  it('returns 400 when interval is invalid (Zod enum validation)', async () => {
    const res = await POST(postReq({ amountCents: 1000, interval: 'WEEKLY', sourceId: 'nonce-1' }));
    expect(res.status).toBe(400);
    expect(mockCreateRecurringSubscription).not.toHaveBeenCalled();
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    const res = await POST(postReq({ amountCents: 1000, interval: 'MONTHLY', sourceId: 'nonce-1' }));
    expect(res.status).toBe(404);
  });

  it('returns 200 with schema-valid subscription result', async () => {
    const res = await POST(postReq({ amountCents: 1000, interval: 'MONTHLY', sourceId: 'nonce-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscriptionId).toBe('sub-1');
    expect(body.receiptNumber).toBeNull();
  });
});
