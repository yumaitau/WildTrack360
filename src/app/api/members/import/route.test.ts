import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockLogAudit,
  mockMemberFindFirst,
  mockCreateMember,
  mockGetActiveTemplate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockLogAudit: vi.fn(),
  mockMemberFindFirst: vi.fn(),
  mockCreateMember: vi.fn(),
  mockGetActiveTemplate: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/prisma', () => ({
  prisma: { member: { findFirst: mockMemberFindFirst } },
}));
vi.mock('@/lib/members', () => ({ createMember: mockCreateMember }));
vi.mock('@/lib/forms/form-template-service', () => ({
  getActiveTemplate: mockGetActiveTemplate,
}));

import { POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');
const baseMember = {
  id: 'member-1',
  clerkOrganizationId: 'org-1',
  email: 'jane@example.org',
  firstName: 'Jane',
  lastName: 'Doe',
  country: 'AU',
  status: 'ACTIVE',
  joinedAt: D,
  createdAt: D,
  updatedAt: D,
};

function jsonReq(body: unknown) {
  return new Request('http://t.localhost/api/members/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const HEADER = 'email,firstName,lastName';
const DATA_ROW = 'jane@example.org,Jane,Doe';

describe('POST /api/members/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetActiveTemplate.mockResolvedValue(null);
    mockMemberFindFirst.mockResolvedValue(null);
    mockCreateMember.mockResolvedValue(baseMember);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await POST(jsonReq({ csv: `${HEADER}\n${DATA_ROW}` }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await POST(jsonReq({ csv: `${HEADER}\n${DATA_ROW}` }));
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty CSV', async () => {
    const res = await POST(jsonReq({ csv: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Empty CSV');
  });

  it('returns 400 when CSV has no data rows (header only)', async () => {
    const res = await POST(jsonReq({ csv: HEADER }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('CSV has no data rows');
  });

  it('returns 200 with schema-valid import result for a valid CSV', async () => {
    const res = await POST(jsonReq({ csv: `${HEADER}\n${DATA_ROW}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.created).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].status).toBe('created');
  });
});
