import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    savedReportQuery: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    incidentReport: { findMany: vi.fn(async () => []) },
  },
}));

vi.mock('@/lib/clerk-server', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/rbac', () => ({
  getUserRole: vi.fn(async () => 'ADMIN'),
  hasPermission: vi.fn(() => true),
  hasMinimumRole: vi.fn(() => true),
}));

import { PATCH, DELETE } from './[id]/route';
import { POST as PREVIEW } from './preview/route';

const USER = 'user_1';
const ORG = 'org_1';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/report-queries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: USER, orgId: ORG });
});

describe('PATCH /api/report-queries/:id', () => {
  it('looks up and updates the query scoped by { id, orgId }', async () => {
    mockPrisma.savedReportQuery.findFirst
      .mockResolvedValueOnce({ id: 'q1', orgId: ORG, createdByUserId: USER })
      .mockResolvedValueOnce({ id: 'q1', orgId: ORG, name: 'Renamed' });
    mockPrisma.savedReportQuery.updateMany.mockResolvedValue({ count: 1 });

    const res = await PATCH(jsonRequest({ name: 'Renamed' }), {
      params: Promise.resolve({ id: 'q1' }),
    });

    expect(res.status).toBe(200);
    expect(mockPrisma.savedReportQuery.findFirst).toHaveBeenCalledWith({
      where: { id: 'q1', orgId: ORG },
    });
    expect(mockPrisma.savedReportQuery.updateMany).toHaveBeenCalledWith({
      where: { id: 'q1', orgId: ORG },
      data: { name: 'Renamed' },
    });
  });

  it('returns 404 when the query belongs to another org', async () => {
    mockPrisma.savedReportQuery.findFirst.mockResolvedValue(null);
    const res = await PATCH(jsonRequest({ name: 'x' }), {
      params: Promise.resolve({ id: 'other' }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.savedReportQuery.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid query on update via the parser', async () => {
    mockPrisma.savedReportQuery.findFirst.mockResolvedValue({
      id: 'q1',
      orgId: ORG,
      createdByUserId: USER,
    });
    const res = await PATCH(jsonRequest({ query: 'count from dragons' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(400);
    expect(mockPrisma.savedReportQuery.updateMany).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/report-queries/:id', () => {
  it('deletes scoped by { id, orgId }', async () => {
    mockPrisma.savedReportQuery.findFirst.mockResolvedValue({
      id: 'q1',
      orgId: ORG,
      createdByUserId: USER,
    });
    mockPrisma.savedReportQuery.deleteMany.mockResolvedValue({ count: 1 });

    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'q1' }) }
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.savedReportQuery.deleteMany).toHaveBeenCalledWith({
      where: { id: 'q1', orgId: ORG },
    });
  });
});

describe('POST /api/report-queries/preview', () => {
  it('evaluates queries scoped to the caller org and returns aggregates only', async () => {
    mockPrisma.incidentReport.findMany.mockResolvedValue([
      { severity: 'HIGH', date: new Date('2026-05-01') },
      { severity: 'LOW', date: new Date('2026-05-02') },
    ] as any);

    const res = await PREVIEW(
      jsonRequest({
        queries: ['count from incidents group by severity'],
        start: '2026-04-01',
        end: '2026-06-01',
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].ok).toBe(true);
    // Tenant scoping reached Prisma.
    const where = (mockPrisma.incidentReport.findMany.mock.calls as any)[0]?.[0]?.where;
    expect(where.clerkOrganizationId).toBe(ORG);
  });

  it('does not import or invoke any AI / report-generation code', () => {
    // Static guarantee: the preview route must remain a pure evaluator.
    const src = readFileSync(
      path.join(__dirname, 'preview', 'route.ts'),
      'utf8'
    );
    expect(src).not.toMatch(/wally|bedrock|@ai-sdk|generateText|streamText/i);
  });
});
