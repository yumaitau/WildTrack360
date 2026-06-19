import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

const {
  mockAuth,
  mockRequirePermission,
  mockGateFeature,
  mockInvitePortalMember,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockGateFeature: vi.fn(),
  mockInvitePortalMember: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/rbac', () => ({ requirePermission: mockRequirePermission }));
vi.mock('@/lib/features', () => ({ gateFeature: mockGateFeature }));
vi.mock('@/lib/portal-invite', () => ({ invitePortalMember: mockInvitePortalMember }));

import { POST } from './route';

function req() {
  return new Request('http://t.localhost/api/members/member-1/invite', { method: 'POST' });
}

function idParams(id = 'member-1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/members/[id]/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGateFeature.mockResolvedValue(null);
    mockRequirePermission.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    const res = await POST(req(), idParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is gated', async () => {
    mockGateFeature.mockResolvedValue(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    );
    const res = await POST(req(), idParams());
    expect(res.status).toBe(404);
  });

  it('returns 403 when permission throws', async () => {
    mockRequirePermission.mockRejectedValue(new Error('Forbidden'));
    const res = await POST(req(), idParams());
    expect(res.status).toBe(403);
  });

  it('returns 200 with { ok: true } when invitation is sent', async () => {
    mockInvitePortalMember.mockResolvedValue({ sent: true });
    const res = await POST(req(), idParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 404 when reason is not-found', async () => {
    mockInvitePortalMember.mockResolvedValue({ sent: false, reason: 'not-found' });
    const res = await POST(req(), idParams());
    expect(res.status).toBe(404);
  });

  it('returns 400 when reason is already-active', async () => {
    mockInvitePortalMember.mockResolvedValue({ sent: false, reason: 'already-active' });
    const res = await POST(req(), idParams());
    expect(res.status).toBe(400);
  });
});
