import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockGetAssets, mockCreateAsset, mockLogAudit } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetAssets: vi.fn(),
  mockCreateAsset: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/database', () => ({ getAssets: mockGetAssets, createAsset: mockCreateAsset }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseAsset = {
  id: 'asset-1',
  name: 'Trap Cage',
  type: 'EQUIPMENT',
  status: 'AVAILABLE' as const,
  description: null,
  location: null,
  assignedTo: null,
  purchaseDate: null,
  lastMaintenance: null,
  notes: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
};

function getReq() {
  return new Request('http://t.localhost/api/assets', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/assets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetAssets.mockResolvedValue([baseAsset]);
  });

  it('returns 200 with schema-valid asset list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('asset-1');
    expect(body[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockCreateAsset.mockResolvedValue(baseAsset);
  });

  it('returns 400 when required body fields are missing before calling createAsset', async () => {
    // Missing required `name`, `type`, `status`
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid asset on valid body', async () => {
    const res = await POST(postReq({ name: 'Trap Cage', type: 'EQUIPMENT', status: 'AVAILABLE' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('asset-1');
    expect(body.status).toBe('AVAILABLE');
  });
});
