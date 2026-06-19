import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockGetMember,
  mockUpdateMember,
  mockArchiveMember,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockGetMember: vi.fn(),
  mockUpdateMember: vi.fn(),
  mockArchiveMember: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/members', () => ({
  getMember: mockGetMember,
  updateMember: mockUpdateMember,
  archiveMember: mockArchiveMember,
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, PATCH, DELETE } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseMember = {
  id: 'member-1',
  clerkOrganizationId: 'org-1',
  clerkUserId: null,
  clerkInvitationId: null,
  portalInvitedAt: null,
  carerProfileId: null,
  squareCustomerId: null,
  squareCardId: null,
  email: 'jane@example.org',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: null,
  addressLine1: null,
  addressLine2: null,
  suburb: null,
  state: null,
  postcode: null,
  country: 'AU',
  memberNumber: 'M0001',
  status: 'ACTIVE' as const,
  joinedAt: D,
  primaryMemberId: null,
  customFieldsJson: {},
  archivedAt: null,
  createdAt: D,
  updatedAt: D,
};

const memberWithMemberships = {
  ...baseMember,
  memberships: [
    {
      id: 'ms-1',
      memberId: 'member-1',
      tierId: 'tier-1',
      periodStart: D,
      periodEnd: new Date('2027-01-01T00:00:00.000Z'),
      status: 'ACTIVE',
      createdAt: D,
      tier: {
        id: 'tier-1',
        name: 'Standard',
        amountCents: 5000,
        currency: 'AUD',
        billingInterval: 'ANNUAL',
        active: true,
      },
    },
  ],
};

function idParams(id = 'member-1') {
  return { params: Promise.resolve({ id }) };
}

function req(method: 'GET' | 'PATCH' | 'DELETE', body?: unknown) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new Request('http://t.localhost/api/members/member-1', init);
}

describe('GET /api/members/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetMember.mockResolvedValue(memberWithMemberships);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await GET(req('GET'), idParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when member not found', async () => {
    mockGetMember.mockResolvedValue(null);
    const res = await GET(req('GET'), idParams());
    expect(res.status).toBe(404);
  });

  it('returns 200 with a schema-valid body including memberships (no validation throw)', async () => {
    const res = await GET(req('GET'), idParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('member-1');
    expect(body.joinedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(Array.isArray(body.memberships)).toBe(true);
    expect(body.memberships[0].tier.name).toBe('Standard');
  });
});

describe('PATCH /api/members/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockUpdateMember.mockResolvedValue(baseMember);
  });

  it('returns 400 for an invalid body (bad enum value) before calling updateMember', async () => {
    const res = await PATCH(req('PATCH', { status: 'INVALID_STATUS' }), idParams());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request');
    expect(mockUpdateMember).not.toHaveBeenCalled();
  });

  it('returns 200 with a schema-valid body', async () => {
    const res = await PATCH(req('PATCH', { firstName: 'Janet' }), idParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('member-1');
  });

  it('returns 404 when updateMember throws Member not found', async () => {
    mockUpdateMember.mockRejectedValue(new Error('Member not found'));
    const res = await PATCH(req('PATCH', { firstName: 'Janet' }), idParams());
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/members/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockArchiveMember.mockResolvedValue(undefined);
  });

  it('returns 200 with { ok: true }', async () => {
    const res = await DELETE(req('DELETE'), idParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 404 when archiveMember throws', async () => {
    mockArchiveMember.mockRejectedValue(new Error('Member not found'));
    const res = await DELETE(req('DELETE'), idParams());
    expect(res.status).toBe(404);
  });
});
