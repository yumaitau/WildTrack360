import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockGetPortalMember,
  mockGateFeature,
  mockListMemberMessages,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGateFeature: vi.fn(),
  mockListMemberMessages: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/member-messages', () => ({ listMemberMessages: mockListMemberMessages }));

import { GET } from './route';

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

const baseMessage = {
  id: 'msg-1',
  subject: 'Hello',
  body: 'World',
  sentByName: null,
  readAt: null,
  createdAt: D,
};

function getReq(search = '') {
  const url = search
    ? `http://t.localhost/api/portal/messages?${search}`
    : 'http://t.localhost/api/portal/messages';
  return new Request(url, { method: 'GET' });
}

describe('GET /api/portal/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGateFeature.mockResolvedValue(null);
    mockListMemberMessages.mockResolvedValue([baseMessage]);
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

  it('returns 200 with schema-valid messages (Dates as ISO strings)', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages[0].id).toBe('msg-1');
    expect(body.messages[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(body.messages[0].readAt).toBeNull();
    expect(body.nextCursor).toBeNull();
  });

  it('sets nextCursor when there are more results', async () => {
    // Return limit+1 rows to trigger hasMore
    mockListMemberMessages.mockResolvedValue([
      { ...baseMessage, id: 'msg-1' },
      { ...baseMessage, id: 'msg-2' },
    ]);
    const res = await GET(getReq('limit=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.nextCursor).toBe('msg-1');
  });
});
