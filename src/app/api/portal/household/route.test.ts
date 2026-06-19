import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetPortalMember,
  mockFindFirstMembership,
  mockListHouseholdMembers,
  mockAddHouseholdMember,
  mockRemoveHouseholdMember,
  mockSanitizePlainText,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockFindFirstMembership: vi.fn(),
  mockListHouseholdMembers: vi.fn(),
  mockAddHouseholdMember: vi.fn(),
  mockRemoveHouseholdMember: vi.fn(),
  mockSanitizePlainText: vi.fn((s: string) => s),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/prisma', () => ({
  prisma: { membership: { findFirst: mockFindFirstMembership } },
}));
vi.mock('@/lib/household', () => ({
  listHouseholdMembers: mockListHouseholdMembers,
  addHouseholdMember: mockAddHouseholdMember,
  removeHouseholdMember: mockRemoveHouseholdMember,
}));
vi.mock('@/lib/sanitize', () => ({ sanitizePlainText: mockSanitizePlainText }));

import { GET, POST, DELETE } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseMember = {
  id: 'member-1',
  clerkOrganizationId: 'org-1',
  email: 'jane@example.org',
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

const baseHouseholdMember = {
  id: 'member-2',
  firstName: 'Bob',
  lastName: 'Doe',
  email: 'bob@example.org',
  clerkUserId: null,
};

function makeReq(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    ...(body !== undefined
      ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
}

describe('GET /api/portal/household', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockFindFirstMembership.mockResolvedValue({ id: 'ms-1' });
    mockListHouseholdMembers.mockResolvedValue([baseHouseholdMember]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(makeReq('GET', 'http://t.localhost/api/portal/household'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member is secondary (primaryMemberId set)', async () => {
    mockGetPortalMember.mockResolvedValue({
      member: { ...baseMember, primaryMemberId: 'other-1' },
      email: 'jane@example.org',
    });
    const res = await GET(makeReq('GET', 'http://t.localhost/api/portal/household'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when no active membership', async () => {
    mockFindFirstMembership.mockResolvedValue(null);
    const res = await GET(makeReq('GET', 'http://t.localhost/api/portal/household'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with schema-valid member list', async () => {
    const res = await GET(makeReq('GET', 'http://t.localhost/api/portal/household'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members[0].id).toBe('member-2');
    expect(body.members[0].email).toBe('bob@example.org');
  });
});

describe('POST /api/portal/household', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockFindFirstMembership.mockResolvedValue({ id: 'ms-1' });
    mockAddHouseholdMember.mockResolvedValue({ id: 'member-2' });
    mockSanitizePlainText.mockImplementation((s: string) => s);
  });

  it('returns 200 with the new member id', async () => {
    const res = await POST(
      makeReq('POST', 'http://t.localhost/api/portal/household', {
        firstName: 'Bob',
        lastName: 'Doe',
        email: 'bob@example.org',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('member-2');
  });
});

describe('DELETE /api/portal/household', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockFindFirstMembership.mockResolvedValue({ id: 'ms-1' });
    mockRemoveHouseholdMember.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated and no ?id= (auth-first ordering)', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await DELETE(makeReq('DELETE', 'http://t.localhost/api/portal/household'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when id query param is missing', async () => {
    const res = await DELETE(makeReq('DELETE', 'http://t.localhost/api/portal/household'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('id required');
  });

  it('returns 200 with ok: true when member is removed', async () => {
    const res = await DELETE(
      makeReq('DELETE', 'http://t.localhost/api/portal/household?id=member-2')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
