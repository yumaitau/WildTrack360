import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: { releaseChecklist: { findMany: vi.fn(), create: vi.fn() } },
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseChecklist = {
  id: 'checklist-1',
  releaseDate: D,
  animalId: 'animal-1',
  releaseLocation: 'National Park',
  releaseCoordinates: null,
  within10km: true,
  releaseType: 'SOFT',
  fitnessIndicators: ['healthy_weight', 'normal_behaviour'],
  vetSignOff: null,
  photos: null,
  completed: true,
  notes: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
};

function getReq() {
  return new Request('http://t.localhost/api/release-checklists', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/release-checklists', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/release-checklists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.releaseChecklist.findMany.mockResolvedValue([baseChecklist]);
  });

  it('returns 200 with schema-valid checklist list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('checklist-1');
    expect(body[0].releaseDate).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/release-checklists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.releaseChecklist.create.mockResolvedValue(baseChecklist);
  });

  it('returns 400 when required fields missing before calling create', async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockPrisma.releaseChecklist.create).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid checklist on valid body', async () => {
    const res = await POST(postReq({
      releaseDate: '2026-01-01',
      animalId: 'animal-1',
      releaseLocation: 'National Park',
      releaseType: 'SOFT',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('checklist-1');
    expect(body.completed).toBe(true);
  });
});
