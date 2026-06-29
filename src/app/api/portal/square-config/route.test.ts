import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetPortalMember,
  mockGetConnection,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGetConnection: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/square/oauth', () => ({ getConnection: mockGetConnection }));

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
const baseConn = { locationId: 'loc-1', revokedAt: null };

function getReq() {
  return new Request('http://t.localhost/api/portal/square-config', { method: 'GET' });
}

describe('GET /api/portal/square-config', () => {
  const origAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const origFallbackId = process.env.SQUARE_APPLICATION_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGetConnection.mockResolvedValue(baseConn);
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID = 'app-id-1';
    delete process.env.SQUARE_APPLICATION_ID;
  });

  afterEach(() => {
    if (origAppId !== undefined) process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID = origAppId;
    else delete process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    if (origFallbackId !== undefined) process.env.SQUARE_APPLICATION_ID = origFallbackId;
    else delete process.env.SQUARE_APPLICATION_ID;
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('returns 503 when Square connection is missing', async () => {
    mockGetConnection.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('Payments not configured');
  });

  it('returns 503 when Square connection is revoked', async () => {
    mockGetConnection.mockResolvedValue({ ...baseConn, revokedAt: D });
    const res = await GET(getReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('Payments not configured');
  });

  it('returns 503 when application id env vars are unset', async () => {
    delete process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    delete process.env.SQUARE_APPLICATION_ID;
    const res = await GET(getReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('Square application id not configured');
  });

  it('returns 200 with applicationId and locationId', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applicationId).toBe('app-id-1');
    expect(body.locationId).toBe('loc-1');
  });
});
