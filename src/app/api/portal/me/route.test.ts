import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockPrismaUpdate,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockPrismaUpdate: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({
  getPortalMember: mockGetPortalMember,
  pickPortalEditable: (body: Record<string, unknown>) => {
    const allowed = ['firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2', 'suburb', 'state', 'postcode', 'country'];
    return Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  },
}));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/prisma', () => ({ prisma: { member: { update: mockPrismaUpdate } } }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, PATCH } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseMember = {
  id: 'member-1',
  clerkOrganizationId: 'org-1',
  clerkUserId: null,
  clerkInvitationId: null,
  carerProfileId: null,
  squareCustomerId: null,
  squareCardId: null,
  portalInvitedAt: null,
  primaryMemberId: null,
  archivedAt: null,
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
  memberNumber: null,
  status: 'ACTIVE' as const,
  joinedAt: D,
  createdAt: D,
  updatedAt: D,
  customFieldsJson: {},
};

const baseSession = { member: baseMember, email: 'jane@example.org' };

function getReq() {
  return new Request('http://t.localhost/api/portal/me', { method: 'GET' });
}

function patchReq(body: unknown) {
  return new Request('http://t.localhost/api/portal/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/portal/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('returns 404 when no membership found', async () => {
    mockGetPortalMember.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(404);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    const res = await GET(getReq());
    expect(res.status).toBe(404);
  });

  it('returns 200 with schema-valid PortalMe (joinedAt is ISO string)', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('member-1');
    expect(body.email).toBe('jane@example.org');
    expect(body.status).toBe('ACTIVE');
    expect(body.joinedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(body.clerkOrganizationId).toBe('org-1');
  });
});

describe('PATCH /api/portal/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockPrismaUpdate.mockResolvedValue({ ...baseMember, firstName: 'Janet' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await PATCH(patchReq({ firstName: 'Janet' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no editable fields supplied', async () => {
    const res = await PATCH(patchReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('No editable fields supplied');
  });

  it('returns 200 with schema-valid PortalMe after update', async () => {
    const res = await PATCH(patchReq({ firstName: 'Janet' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('member-1');
    expect(body.joinedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(mockPrismaUpdate).toHaveBeenCalledOnce();
  });
});
