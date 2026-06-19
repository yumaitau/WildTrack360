import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockGetImpactStats,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockGetImpactStats: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/org-info', () => ({ getImpactStats: mockGetImpactStats }));

import { GET } from './route';

function req() {
  return new Request('http://t.localhost/api/members/impact-stats', { method: 'GET' });
}

describe('GET /api/members/impact-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
    mockGetImpactStats.mockResolvedValue({ animalsHelped: 42, animalsReleased: 17 });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it('returns 200 with schema-valid impact stats (no validation throw)', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.animalsHelped).toBe(42);
    expect(body.animalsReleased).toBe(17);
  });
});
