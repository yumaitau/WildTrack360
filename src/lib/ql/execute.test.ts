import { describe, it, expect, vi } from 'vitest';

// Avoid constructing a real PrismaClient (no DATABASE_URL in tests); the
// executor receives a fake client via options instead.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { parseQuery } from './parser';
import { executeQuery } from './execute';
import type { QueryAST } from './types';

function ast(text: string): QueryAST {
  const { ast, error } = parseQuery(text);
  if (!ast) throw new Error(`parse failed: ${error}`);
  return ast;
}

/** Build a fake Prisma client that records query args and returns canned rows. */
function fakeClient(rows: Record<string, unknown>[]) {
  const calls: { model: string; args: any }[] = [];
  const handler = {
    findMany: vi.fn(async (args: any) => {
      return rows;
    }),
  };
  return {
    client: new Proxy(
      {},
      {
        get: (_t, model: string) => ({
          findMany: async (args: any) => {
            calls.push({ model, args });
            return handler.findMany(args);
          },
        }),
      }
    ) as any,
    calls,
  };
}

const NOW = new Date('2025-06-01T00:00:00.000Z');

describe('executeQuery — tenant isolation', () => {
  it('always scopes the read to the caller organisation', async () => {
    const { client, calls } = fakeClient([]);
    await executeQuery(ast('from animals group by species'), 'org_ABC', { client, now: NOW });
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe('animal');
    expect(calls[0].args.where.clerkOrganizationId).toBe('org_ABC');
  });

  it('never allows a filter to override the tenant scope', async () => {
    const { client, calls } = fakeClient([]);
    // status filter is pushed down but must not replace clerkOrganizationId
    await executeQuery(ast('from animals where status = IN_CARE'), 'org_XYZ', { client, now: NOW });
    expect(calls[0].args.where.clerkOrganizationId).toBe('org_XYZ');
    expect(calls[0].args.where.status).toBe('IN_CARE');
  });

  it('only selects allowlisted columns and bounds by the date field', async () => {
    const { client, calls } = fakeClient([]);
    await executeQuery(ast('from animals group by species'), 'org_1', { client, now: NOW });
    const args = calls[0].args;
    expect(Object.keys(args.select).sort()).toEqual(['dateFound', 'species']);
    expect(args.where.dateFound).toHaveProperty('gte');
    expect(args.where.dateFound).toHaveProperty('lte');
    expect(args.take).toBeGreaterThan(0);
  });
});

describe('executeQuery — aggregation', () => {
  it('counts grouped rows and sorts non-month groups by descending value', async () => {
    const { client } = fakeClient([
      { species: 'Possum', dateFound: NOW },
      { species: 'Possum', dateFound: NOW },
      { species: 'Magpie', dateFound: NOW },
    ]);
    const result = await executeQuery(ast('from animals group by species'), 'org_1', { client, now: NOW });
    expect(result.columns).toEqual(['Species', 'Count']);
    expect(result.rows).toEqual([
      { group: 'Possum', value: 2 },
      { group: 'Magpie', value: 1 },
    ]);
  });

  it('returns a single "All" row when no group is given', async () => {
    const { client } = fakeClient([
      { dateFound: NOW },
      { dateFound: NOW },
    ]);
    const result = await executeQuery(ast('from animals'), 'org_1', { client, now: NOW });
    expect(result.rows).toEqual([{ group: 'All', value: 2 }]);
  });

  it('produces a chronological trend line when grouping by month', async () => {
    const { client } = fakeClient([
      { dateFound: new Date('2025-03-15T00:00:00Z') },
      { dateFound: new Date('2025-01-10T00:00:00Z') },
      { dateFound: new Date('2025-03-20T00:00:00Z') },
      { dateFound: new Date('2025-02-01T00:00:00Z') },
    ]);
    const result = await executeQuery(ast('from animals group by foundMonth'), 'org_1', { client, now: NOW });
    expect(result.rows).toEqual([
      { group: '2025-01', value: 1 },
      { group: '2025-02', value: 1 },
      { group: '2025-03', value: 2 },
    ]);
  });

  it('sums a numeric field per group', async () => {
    const { client } = fakeClient([
      { species: 'Possum', initialWeightGrams: 100, dateFound: NOW },
      { species: 'Possum', initialWeightGrams: 50, dateFound: NOW },
      { species: 'Magpie', initialWeightGrams: 300, dateFound: NOW },
    ]);
    const result = await executeQuery(ast('from animals group by species select sum initialWeightGrams'), 'org_1', {
      client,
      now: NOW,
    });
    expect(result.columns[1]).toMatch(/Sum of/);
    expect(result.rows).toEqual([
      { group: 'Magpie', value: 300 },
      { group: 'Possum', value: 150 },
    ]);
  });

  it('applies derived-field filters in memory', async () => {
    const { client } = fakeClient([
      { species: 'Possum', notes: 'sick', dateFound: NOW },
      { species: 'Possum', notes: null, dateFound: NOW },
    ]);
    const result = await executeQuery(ast('from animals where hasNotes = true group by species'), 'org_1', {
      client,
      now: NOW,
    });
    expect(result.rows).toEqual([{ group: 'Possum', value: 1 }]);
  });

  it('labels null group values as (none)', async () => {
    const { client } = fakeClient([{ species: null, dateFound: NOW }]);
    const result = await executeQuery(ast('from animals group by species'), 'org_1', { client, now: NOW });
    expect(result.rows).toEqual([{ group: '(none)', value: 1 }]);
  });
});
