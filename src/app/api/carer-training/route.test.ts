import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    carerTraining: { findMany: vi.fn(), create: vi.fn() },
    carerProfile: { findFirst: vi.fn() },
  },
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseTraining = {
  id: 'training-1',
  carerId: 'carer-1',
  courseName: 'Wildlife First Aid',
  provider: null,
  date: D,
  expiryDate: null,
  certificateUrl: null,
  certificateNumber: null,
  trainingType: null,
  trainingHours: null,
  notes: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
  carer: { id: 'carer-1' },
};

function getReq(search?: string) {
  const url = search
    ? `http://t.localhost/api/carer-training?${search}`
    : 'http://t.localhost/api/carer-training';
  return new Request(url, { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/carer-training', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/carer-training', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.carerTraining.findMany.mockResolvedValue([baseTraining]);
  });

  it('returns 200 with schema-valid training list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('training-1');
    expect(body[0].date).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/carer-training', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.carerProfile.findFirst.mockResolvedValue({ id: 'carer-1' });
    mockPrisma.carerTraining.create.mockResolvedValue(baseTraining);
  });

  it('returns 400 when required body fields are missing before calling create', async () => {
    // missing carerId and courseName
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockPrisma.carerTraining.create).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid training on valid body', async () => {
    const res = await POST(postReq({ carerId: 'carer-1', courseName: 'Wildlife First Aid', date: '2026-01-01' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('training-1');
    expect(body.courseName).toBe('Wildlife First Aid');
  });
});
