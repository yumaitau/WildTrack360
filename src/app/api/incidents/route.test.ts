import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrisma, mockLogAudit } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: { incidentReport: { findMany: vi.fn(), create: vi.fn() } },
  mockLogAudit: vi.fn(),
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { GET, POST } from './route';

const D = new Date('2026-01-01T00:00:00.000Z');

const baseIncident = {
  id: 'incident-1',
  date: D,
  type: 'INJURY',
  description: 'Animal injured',
  severity: 'LOW' as const,
  resolved: false,
  resolution: null,
  personInvolved: null,
  reportedTo: null,
  actionTaken: null,
  location: null,
  animalId: null,
  notes: null,
  attachments: null,
  clerkUserId: 'user-1',
  clerkOrganizationId: 'org-1',
  createdAt: D,
  updatedAt: D,
};

function getReq() {
  return new Request('http://t.localhost/api/incidents', { method: 'GET' });
}

function postReq(body: unknown) {
  return new Request('http://t.localhost/api/incidents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.incidentReport.findMany.mockResolvedValue([baseIncident]);
  });

  it('returns 200 with schema-valid incident list', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('incident-1');
    expect(body[0].date).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('POST /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1', orgId: 'org-1' });
    mockPrisma.incidentReport.create.mockResolvedValue(baseIncident);
  });

  it('returns 400 when required body fields are missing before calling create', async () => {
    // missing required: type, description, severity
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(mockPrisma.incidentReport.create).not.toHaveBeenCalled();
  });

  it('returns 201 with schema-valid incident on valid body', async () => {
    const res = await POST(postReq({ type: 'INJURY', description: 'Animal injured', severity: 'LOW' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('incident-1');
    expect(body.severity).toBe('LOW');
  });
});
