import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockGetActiveTemplate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockGetActiveTemplate: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/forms/form-template-service', () => ({
  getActiveTemplate: mockGetActiveTemplate,
}));

import { GET } from './route';

function req() {
  return new Request('http://t.localhost/api/members/import/sample', { method: 'GET' });
}

describe('GET /api/members/import/sample', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
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

  it('returns 200 with content-type text/csv', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/csv/);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await GET(req());
    expect(res.status).toBe(404);
  });
});
