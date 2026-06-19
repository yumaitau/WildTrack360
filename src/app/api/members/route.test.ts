import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockListMembers,
  mockCreateMember,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockListMembers: vi.fn(),
  mockCreateMember: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/members', () => ({
  listMembers: mockListMembers,
  createMember: mockCreateMember,
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

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

function getReq(search?: string) {
  const url = search
    ? `http://t.localhost/api/members?${search}`
    : 'http://t.localhost/api/members';
  return new Request(url, { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/members', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockListMembers.mockResolvedValue([baseMember]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 when permission throws', async () => {
    mockRequirePermission.mockRejectedValue(new Error('Forbidden'));
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await GET(getReq());
    expect(res.status).toBe(404);
  });

  it('returns 200 with a schema-valid member list (no validation throw)', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('member-1');
    expect(body[0].joinedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockCreateMember.mockResolvedValue(baseMember);
  });

  it('returns 400 for an invalid body (missing email) before calling createMember', async () => {
    const res = await POST(postReq({ firstName: 'Jane', lastName: 'Doe' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request');
    expect(mockCreateMember).not.toHaveBeenCalled();
  });

  it('creates a member and returns 201 with a schema-valid body', async () => {
    const res = await POST(
      postReq({ email: 'jane@example.org', firstName: 'Jane', lastName: 'Doe' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('member-1');
    expect(body.status).toBe('ACTIVE');
    expect(mockCreateMember).toHaveBeenCalledOnce();
  });
});
