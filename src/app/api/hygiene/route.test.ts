import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: { hygieneLog: { findMany: vi.fn(), create: vi.fn() } },
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseLog = {
  id: 'hygiene-1',
  date: D,
  type: 'DAILY',
  description: 'Daily check',
  completed: true,
  enclosureCleaned: true,
  ppeUsed: false,
  handwashAvailable: true,
  feedingBowlsDisinfected: false,
  quarantineSignsPresent: false,
  photos: null,
  carerId: 'carer-1',
  notes: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
  carer: { id: 'carer-1' },
};

function getReq() {
  return new Request('http://t.localhost/api/hygiene', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/hygiene', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/hygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.hygieneLog.findMany.mockResolvedValue([baseLog]);
  });

  it('returns 200 with schema-valid hygiene log list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('hygiene-1');
    expect(body[0].date).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/hygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.hygieneLog.create.mockResolvedValue(baseLog);
  });

  it('returns 400 when carerId is missing before calling create', async () => {
    const res = await POST(postReq({ type: 'DAILY' }));
    expect(res.status).toBe(400);
    expect(mockPrisma.hygieneLog.create).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid hygiene log on valid body', async () => {
    const res = await POST(postReq({ carerId: 'carer-1', type: 'DAILY', description: 'Check' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('hygiene-1');
    expect(body.type).toBe('DAILY');
  });
});
