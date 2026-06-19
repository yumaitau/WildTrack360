import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockAuth,
  mockGetPortalMember,
  mockGetOpenInterest,
  mockCreateCarerInterest,
  mockSanitizePlainText,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetPortalMember: vi.fn(),
  mockGetOpenInterest: vi.fn(),
  mockCreateCarerInterest: vi.fn(),
  mockSanitizePlainText: vi.fn((s: string) => s),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/portal', () => ({ getPortalMember: mockGetPortalMember }));
vi.mock('@/lib/carer-interest', () => ({
  getOpenInterest: mockGetOpenInterest,
  createCarerInterest: mockCreateCarerInterest,
}));
vi.mock('@/lib/sanitize', () => ({ sanitizePlainText: mockSanitizePlainText }));

import { GET, POST } from './route';

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

const baseInterest = {
  id: 'ci-1',
  clerkOrganizationId: 'org-1',
  name: 'Jane Doe',
  email: 'jane@example.org',
  memberId: null,
  phone: null,
  experience: null,
  availability: null,
  message: null,
  status: 'NEW' as const,
  createdAt: D,
  updatedAt: D,
};

function getReq() {
  return new Request('http://t.localhost/api/portal/carer-interest', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/portal/carer-interest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/portal/carer-interest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockGetOpenInterest.mockResolvedValue(baseInterest);
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

  it('returns 200 with schema-valid open interest (Dates as ISO strings)', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.open.id).toBe('ci-1');
    expect(body.open.status).toBe('NEW');
    expect(body.open.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(body.open.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns 200 with open: null when no interest found', async () => {
    mockGetOpenInterest.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.open).toBeNull();
  });
});

describe('POST /api/portal/carer-interest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetPortalMember.mockResolvedValue(baseSession);
    mockCreateCarerInterest.mockResolvedValue(baseInterest);
    mockSanitizePlainText.mockImplementation((s: string) => s);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(postReq({}));
    expect(res.status).toBe(401);
  });

  it('returns 200 with the created id', async () => {
    const res = await POST(postReq({ experience: 'Some experience' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('ci-1');
  });

  it('returns 400 when createCarerInterest throws', async () => {
    mockCreateCarerInterest.mockRejectedValue(new Error('You already have an application in progress'));
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('You already have an application in progress');
  });
});
