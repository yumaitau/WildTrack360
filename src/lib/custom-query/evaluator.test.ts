import { describe, it, expect, vi } from 'vitest';
import { evaluateCustomQuery, type QueryablePrisma } from './evaluator';

const ORG = 'org_active';

/** Build a fake Prisma whose delegates return canned rows and record calls. */
function fakePrisma(rowsByModel: Record<string, unknown[]>) {
  const calls: Record<string, { where: Record<string, unknown> }[]> = {};
  const prisma = new Proxy(
    {},
    {
      get(_t, model: string) {
        return {
          findMany: vi.fn(async (args: { where: Record<string, unknown> }) => {
            (calls[model] ??= []).push(args);
            return rowsByModel[model] ?? [];
          }),
        };
      },
    }
  ) as unknown as QueryablePrisma;
  return { prisma, calls };
}

describe('evaluateCustomQuery — aggregation', () => {
  it('groups counts by a categorical field', async () => {
    const { prisma } = fakePrisma({
      incidentReport: [
        { severity: 'HIGH', date: new Date('2026-05-01') },
        { severity: 'HIGH', date: new Date('2026-05-02') },
        { severity: 'LOW', date: new Date('2026-05-03') },
      ],
    });
    const result = await evaluateCustomQuery(
      'count from incidents group by severity chart bar',
      { prisma, orgId: ORG }
    );
    expect(result.ok).toBe(true);
    expect(result.visualization).toBe('bar');
    expect(result.rows).toEqual([
      { label: 'HIGH', value: 2 },
      { label: 'LOW', value: 1 },
    ]);
  });

  it('returns empty rows for an empty grouped result', async () => {
    const { prisma } = fakePrisma({ incidentReport: [] });
    const result = await evaluateCustomQuery(
      'count from incidents group by severity chart bar',
      { prisma, orgId: ORG }
    );
    expect(result.ok).toBe(true);
    expect(result.rows).toEqual([]);
  });

  it('sums a numeric field', async () => {
    const { prisma } = fakePrisma({
      carerTraining: [
        { trainingType: 'Mandatory', trainingHours: 3, date: new Date('2026-05-01') },
        { trainingType: 'Mandatory', trainingHours: 2, date: new Date('2026-05-02') },
        { trainingType: 'Refresher', trainingHours: 4, date: new Date('2026-05-03') },
      ],
    });
    const result = await evaluateCustomQuery(
      'sum trainingHours from carer_training group by trainingType chart bar',
      { prisma, orgId: ORG }
    );
    expect(result.operation).toBe('sum');
    expect(result.rows).toEqual([
      { label: 'Mandatory', value: 5 },
      { label: 'Refresher', value: 4 },
    ]);
  });

  it('applies an in-memory where filter (never pushed to Prisma)', async () => {
    const { prisma, calls } = fakePrisma({
      incidentReport: [
        { severity: 'HIGH', resolved: false, type: 'Escape', date: new Date('2026-05-01') },
        { severity: 'LOW', resolved: true, type: 'Escape', date: new Date('2026-05-02') },
      ],
    });
    const result = await evaluateCustomQuery(
      'count from incidents where resolved = false group by type',
      { prisma, orgId: ORG }
    );
    expect(result.rows).toEqual([{ label: 'Escape', value: 1 }]);
    // The where field must NOT leak into the Prisma query.
    expect(calls.incidentReport[0].where).not.toHaveProperty('resolved');
  });

  it('builds a multi-series line result for group by + trend by', async () => {
    const { prisma } = fakePrisma({
      animal: [
        { species: 'Koala', status: 'IN_CARE', dateFound: new Date('2026-04-15') },
        { species: 'Koala', status: 'IN_CARE', dateFound: new Date('2026-05-10') },
        { species: 'Possum', status: 'IN_CARE', dateFound: new Date('2026-05-20') },
      ],
    });
    const result = await evaluateCustomQuery(
      'count from animals group by species trend by foundMonth chart line',
      { prisma, orgId: ORG }
    );
    expect(result.visualization).toBe('line');
    expect(result.series).toBeDefined();
    const koala = result.series!.find((s) => s.label === 'Koala')!;
    expect(koala.rows).toEqual([
      { label: '2026-04', value: 1 },
      { label: '2026-05', value: 1 },
    ]);
    const possum = result.series!.find((s) => s.label === 'Possum')!;
    expect(possum.rows).toEqual([
      { label: '2026-04', value: 0 },
      { label: '2026-05', value: 1 },
    ]);
    // Top-level rows are per-bucket totals across series.
    expect(result.rows).toEqual([
      { label: '2026-04', value: 1 },
      { label: '2026-05', value: 2 },
    ]);
  });
});

describe('evaluateCustomQuery — tenant isolation & scoping', () => {
  it('scopes every fetch by the caller org and date window', async () => {
    const { prisma, calls } = fakePrisma({ incidentReport: [] });
    await evaluateCustomQuery('count from incidents', {
      prisma,
      orgId: ORG,
    });
    const where = calls.incidentReport[0].where;
    expect(where.clerkOrganizationId).toBe(ORG);
    expect(where).toHaveProperty('date');
    expect((where.date as { gte: Date; lte: Date }).gte).toBeInstanceOf(Date);
  });

  it('ignores any attempt to target another org through the query text', async () => {
    const { prisma, calls } = fakePrisma({ incidentReport: [] });
    // `orgId` is not an allowlisted field — parser rejects it, so this is ok:false
    const result = await evaluateCustomQuery(
      'count from incidents where orgId = other_org',
      { prisma, orgId: ORG }
    );
    expect(result.ok).toBe(false);
    // And nothing was fetched.
    expect(calls.incidentReport).toBeUndefined();
  });
});

describe('evaluateCustomQuery — validation', () => {
  it('rejects an over-long date range (> one year)', async () => {
    const { prisma } = fakePrisma({ incidentReport: [] });
    const result = await evaluateCustomQuery(
      'count from incidents between 2024-01-01 and 2026-01-01',
      { prisma, orgId: ORG }
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/exceed/i);
  });

  it('rejects an unknown source without fetching', async () => {
    const { prisma } = fakePrisma({});
    const result = await evaluateCustomQuery('count from dragons', {
      prisma,
      orgId: ORG,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown source/i);
  });
});
