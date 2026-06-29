import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockFindFirstSub,
  mockUpdateSub,
  mockUpdateMember,
  mockGetValidAccessToken,
  mockSaveCardOnFile,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockFindFirstSub: vi.fn(),
  mockUpdateSub: vi.fn(),
  mockUpdateMember: vi.fn(),
  mockGetValidAccessToken: vi.fn(),
  mockSaveCardOnFile: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    recurringSubscription: { findFirst: mockFindFirstSub, update: mockUpdateSub },
    member: { update: mockUpdateMember },
  },
}));
vi.mock('@/lib/square/oauth', () => ({ getValidAccessToken: mockGetValidAccessToken }));
vi.mock('@/lib/square/cards', () => ({ saveCardOnFile: mockSaveCardOnFile }));

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

const baseSub = {
  id: 'sub-1',
  memberId: 'member-1',
  clerkOrganizationId: 'org-1',
  squareCustomerId: 'sq-cust-1',
};

function postReq(id: string, body: unknown) {
  return new Request(`http://t.localhost/api/portal/subscriptions/${id}/card`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return Promise.resolve({ id });
}

describe('POST /api/portal/subscriptions/[id]/card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockFindFirstSub.mockResolvedValue(baseSub);
    mockGetValidAccessToken.mockResolvedValue({ accessToken: 'tok-1' });
    mockSaveCardOnFile.mockResolvedValue('card-id-1');
    mockUpdateSub.mockResolvedValue(undefined);
    mockUpdateMember.mockResolvedValue(undefined);
  });

  it('returns 400 when sourceId is missing (Zod validation, runs before ownership check)', async () => {
    const res = await POST(postReq('sub-1', {}), { params: makeParams('sub-1') });
    expect(res.status).toBe(400);
    expect(mockFindFirstSub).not.toHaveBeenCalled();
  });

  it('returns 404 when subscription is not owned by member', async () => {
    mockFindFirstSub.mockResolvedValue(null);
    const res = await POST(postReq('sub-999', { sourceId: 'nonce-1' }), {
      params: makeParams('sub-999'),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Subscription not found');
  });

  it('returns 200 with ok: true when card updated', async () => {
    const res = await POST(postReq('sub-1', { sourceId: 'nonce-1' }), {
      params: makeParams('sub-1'),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(mockSaveCardOnFile).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'nonce-1' })
    );
  });
});
