import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockLogAudit,
  mockListMembers,
  mockGetActiveTemplate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockLogAudit: vi.fn(),
  mockListMembers: vi.fn(),
  mockGetActiveTemplate: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/members', () => ({ listMembers: mockListMembers }));
vi.mock('@/lib/forms/form-template-service', () => ({
  getActiveTemplate: mockGetActiveTemplate,
}));

import { GET } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');
const baseMember = {
  id: 'member-1',
  clerkOrganizationId: 'org-1',
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
  status: 'ACTIVE',
  joinedAt: D,
  customFieldsJson: {},
  archivedAt: null,
  createdAt: D,
  updatedAt: D,
};

function req(query?: string) {
  const url = query
    ? `http://t.localhost/api/members/export?${query}`
    : 'http://t.localhost/api/members/export';
  return new Request(url, { method: 'GET' });
}

describe('GET /api/members/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockListMembers.mockResolvedValue([baseMember]);
    mockGetActiveTemplate.mockResolvedValue(null);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns 403 when permission throws', async () => {
    mockRequirePermission.mockRejectedValue(new Error('Forbidden'));
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it('returns 200 with content-type text/csv and a CSV body', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/csv/);
    const body = await res.text();
    expect(body).toContain('email');
    expect(body).toContain('jane@example.org');
  });
});
