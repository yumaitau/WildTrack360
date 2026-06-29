import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit, mockGetUserRole, mockHasPermission } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    postReleaseMonitoring: { findMany: vi.fn(), create: vi.fn() },
    animal: { findFirst: vi.fn() },
  },
  mockLogAudit: vi.fn(),
  mockGetUserRole: vi.fn(),
  mockHasPermission: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/rbac', () => ({ getUserRole: mockGetUserRole, hasPermission: mockHasPermission }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseRecord = {
  id: 'prm-1',
  animalId: 'animal-1',
  date: D,
  time: null,
  location: null,
  coordinates: null,
  animalCondition: null,
  notes: 'Doing well',
  photos: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
  animal: { name: 'Bob', species: 'Echidna' },
};

function getReq() {
  return new Request('http://t.localhost/api/post-release-monitoring', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/post-release-monitoring', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/post-release-monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.postReleaseMonitoring.findMany.mockResolvedValue([baseRecord]);
  });

  it('returns 200 with schema-valid record list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('prm-1');
    expect(body[0].date).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/post-release-monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockGetUserRole.mockResolvedValue('admin');
    mockHasPermission.mockReturnValue(true);
    mockPrisma.animal.findFirst.mockResolvedValue({ id: 'animal-1', carerId: 'user-1' });
    mockPrisma.postReleaseMonitoring.create.mockResolvedValue(baseRecord);
  });

  it('returns 400 when required fields missing before calling create', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockPrisma.postReleaseMonitoring.create).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid record on valid body', async () => {
    const res = await POST(postReq({ animalId: 'animal-1', notes: 'Doing well' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('prm-1');
    expect(body.notes).toBe('Doing well');
  });
});
