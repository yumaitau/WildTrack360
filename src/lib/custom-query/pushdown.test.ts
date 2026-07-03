import { describe, it, expect, vi } from 'vitest';
import { evaluateCustomQuery, type QueryablePrisma } from './evaluator';
import { planPushdown } from './pushdown';
import { parseCustomQuery } from './parser';
import { getCustomQuerySource } from './allowlist';

const ORG = 'org_active';

type Row = Record<string, unknown>;

// ─── In-memory Prisma-semantics interpreter ──────────────────────────────────
// Implements the subset of Prisma where/aggregate/groupBy behaviour the
// pushdown planner emits (AND/OR trees, insensitive equals, null, not-null,
// gte/lte) so parity tests can compare the pushed-down path against the
// findMany/in-memory path over the same rows.

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition === null) return value == null;
  if (condition instanceof Date) {
    return value instanceof Date && value.getTime() === condition.getTime();
  }
  if (typeof condition !== 'object') return value === condition;

  const c = condition as Record<string, unknown>;
  if ('equals' in c) {
    const expected = c.equals;
    if (typeof expected === 'string' && c.mode === 'insensitive') {
      if (typeof value !== 'string' || value.toLowerCase() !== expected.toLowerCase()) return false;
    } else if (value !== expected) {
      return false;
    }
  }
  if ('not' in c) {
    // Prisma `not` compiles to SQL negation — never matches NULL rows.
    if (c.not === null) {
      if (value == null) return false;
    } else if (value == null || matchesCondition(value, c.not)) {
      return false;
    }
  }
  if ('gte' in c) {
    const bound = c.gte as Date;
    if (!(value instanceof Date) || value.getTime() < bound.getTime()) return false;
  }
  if ('lte' in c) {
    const bound = c.lte as Date;
    if (!(value instanceof Date) || value.getTime() > bound.getTime()) return false;
  }
  return true;
}

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'AND') {
      if (!(condition as Record<string, unknown>[]).every((clause) => matchesWhere(row, clause)))
        return false;
      continue;
    }
    if (key === 'OR') {
      if (!(condition as Record<string, unknown>[]).some((clause) => matchesWhere(row, clause)))
        return false;
      continue;
    }
    if (!matchesCondition(row[key], condition)) return false;
  }
  return true;
}

interface FakeOptions {
  /** When true the fake exposes aggregate/groupBy (pushdown-capable). */
  aggregating: boolean;
}

function fakePrisma(rowsByModel: Record<string, Row[]>, { aggregating }: FakeOptions) {
  const findManyCalls: Record<string, { where: Record<string, unknown> }[]> = {};
  const groupByCalls: Record<string, Record<string, unknown>[]> = {};
  const aggregateCalls: Record<string, Record<string, unknown>[]> = {};

  const countsFor = (rows: Row[], args: Record<string, unknown>) => {
    const sumColumns = args._sum ? Object.keys(args._sum as Record<string, boolean>) : [];
    return {
      _count: { _all: rows.length },
      ...(sumColumns.length
        ? {
            _sum: Object.fromEntries(
              sumColumns.map((column) => {
                const values = rows
                  .map((row) => row[column])
                  .filter((v): v is number => typeof v === 'number');
                return [column, values.length ? values.reduce((t, v) => t + v, 0) : null];
              })
            ),
          }
        : {}),
    };
  };

  const prisma = new Proxy(
    {},
    {
      get(_t, model: string) {
        const delegate: Record<string, unknown> = {
          findMany: vi.fn(async (args: { where: Record<string, unknown> }) => {
            (findManyCalls[model] ??= []).push(args);
            // Apply the where like a real database would, so the in-memory
            // path aggregates the same date/tenant-scoped rows as pushdown.
            return (rowsByModel[model] ?? []).filter((row) => matchesWhere(row, args.where));
          }),
        };
        if (aggregating) {
          delegate.aggregate = vi.fn(async (args: Record<string, unknown>) => {
            (aggregateCalls[model] ??= []).push(args);
            const rows = (rowsByModel[model] ?? []).filter((row) =>
              matchesWhere(row, args.where as Record<string, unknown>)
            );
            return countsFor(rows, args);
          });
          delegate.groupBy = vi.fn(async (args: Record<string, unknown>) => {
            (groupByCalls[model] ??= []).push(args);
            const rows = (rowsByModel[model] ?? []).filter((row) =>
              matchesWhere(row, args.where as Record<string, unknown>)
            );
            const by = (args.by as string[])[0];
            const groups = new Map<unknown, Row[]>();
            for (const row of rows) {
              const key = row[by] ?? null;
              const groupRows = groups.get(key) ?? [];
              groupRows.push(row);
              groups.set(key, groupRows);
            }
            return [...groups.entries()].map(([key, groupRows]) => ({
              [by]: key,
              ...countsFor(groupRows, args),
            }));
          });
        }
        return delegate;
      },
    }
  ) as unknown as QueryablePrisma;

  return { prisma, findManyCalls, groupByCalls, aggregateCalls };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const d = (value: string) => new Date(value);

const ROWS: Record<string, Row[]> = {
  animal: [
    // Literal 'Unknown' species must merge with the null-species group label.
    { clerkOrganizationId: ORG, species: 'Koala', status: 'IN_CARE', sex: 'F', ageClass: 'Adult', outcome: null, initialWeightGrams: 4200, carerId: 'carer_a', dateFound: d('2026-02-01') },
    { clerkOrganizationId: ORG, species: 'Koala', status: 'RELEASED', sex: null, ageClass: null, outcome: 'Released', initialWeightGrams: null, carerId: null, dateFound: d('2026-02-15') },
    { clerkOrganizationId: ORG, species: 'Unknown', status: 'IN_CARE', sex: 'M', ageClass: 'Juvenile', outcome: null, initialWeightGrams: 310, carerId: 'carer_b', dateFound: d('2026-03-05') },
    { clerkOrganizationId: ORG, species: null, status: 'DECEASED', sex: 'M', ageClass: '', outcome: null, initialWeightGrams: 95, carerId: null, dateFound: d('2026-03-20') },
    // Outside the bounded window.
    { clerkOrganizationId: ORG, species: 'Possum', status: 'IN_CARE', sex: 'F', ageClass: 'Adult', outcome: null, initialWeightGrams: 1500, carerId: 'carer_a', dateFound: d('2025-01-01') },
  ],
  incidentReport: [
    { clerkOrganizationId: ORG, type: 'Escape', severity: 'HIGH', resolved: false, animalId: 'a1', date: d('2026-02-02') },
    { clerkOrganizationId: ORG, type: 'escape', severity: 'LOW', resolved: true, animalId: null, date: d('2026-02-10') },
    { clerkOrganizationId: ORG, type: 'Injury', severity: 'HIGH', resolved: false, animalId: null, date: d('2026-03-01') },
  ],
  carerTraining: [
    { clerkOrganizationId: ORG, trainingType: 'Mandatory', provider: 'TAFE NSW', trainingHours: 3, date: d('2026-02-01') },
    { clerkOrganizationId: ORG, trainingType: 'Mandatory', provider: null, trainingHours: null, date: d('2026-02-08') },
    { clerkOrganizationId: ORG, trainingType: 'Refresher', provider: 'tafe nsw', trainingHours: 4, date: d('2026-03-11') },
  ],
  hygieneLog: [
    { clerkOrganizationId: ORG, type: 'Enclosure', completed: true, enclosureCleaned: true, ppeUsed: false, handwashAvailable: true, feedingBowlsDisinfected: false, date: d('2026-02-03') },
    { clerkOrganizationId: ORG, type: 'Enclosure', completed: false, enclosureCleaned: false, ppeUsed: true, handwashAvailable: true, feedingBowlsDisinfected: true, date: d('2026-02-04') },
  ],
  releaseChecklist: [
    { clerkOrganizationId: ORG, releaseType: 'HARD', completed: true, within10km: true, releaseDate: d('2026-02-20') },
    { clerkOrganizationId: ORG, releaseType: 'SOFT', completed: false, within10km: false, releaseDate: d('2026-03-15') },
    { clerkOrganizationId: ORG, releaseType: 'SOFT', completed: true, within10km: true, releaseDate: d('2026-04-01') },
  ],
  animalTransfer: [
    { clerkOrganizationId: ORG, toCarerId: 'carer_a', fromCarerId: null, transferType: 'INTERNAL_CARER', receivingEntity: 'Org', transferDate: d('2026-02-01') },
    { clerkOrganizationId: ORG, toCarerId: 'carer_b', fromCarerId: 'carer_a', transferType: 'INTERNAL_CARER', receivingEntity: 'Org', transferDate: d('2026-02-11') },
  ],
};

const BETWEEN = 'between 2026-01-01 and 2026-06-30';

async function assertParity(query: string) {
  const inMemory = fakePrisma(ROWS, { aggregating: false });
  const pushed = fakePrisma(ROWS, { aggregating: true });

  const expected = await evaluateCustomQuery(query, { prisma: inMemory.prisma, orgId: ORG });
  const actual = await evaluateCustomQuery(query, { prisma: pushed.prisma, orgId: ORG });

  expect(expected.ok).toBe(true);
  expect(actual).toEqual(expected);
  // The pushed run must actually have pushed down — no row fetch.
  expect(Object.keys(pushed.findManyCalls)).toEqual([]);
}

describe('pushdown parity with the in-memory evaluator', () => {
  const cases = [
    `count from animals ${BETWEEN}`,
    `count from animals ${BETWEEN} group by species`,
    `count from animals ${BETWEEN} group by status chart pie`,
    `count from animals ${BETWEEN} group by ageClass`,
    `count from animals ${BETWEEN} where status = in_care group by species`,
    `count from animals ${BETWEEN} where species = unknown`,
    `count from animals ${BETWEEN} where sex = null group by status`,
    `count from animals ${BETWEEN} where hasCarer = yes`,
    `count from animals ${BETWEEN} where hasCarer = false group by species`,
    `sum weightGrams from animals ${BETWEEN}`,
    `sum weightGrams from animals ${BETWEEN} group by species`,
    `sum weightGrams from animals ${BETWEEN} where weightGrams = 310`,
    `count from animals ${BETWEEN} group by species limit 2`,
    `count from incidents ${BETWEEN} where type = ESCAPE group by severity`,
    `count from incidents ${BETWEEN} where resolved = no`,
    `count from incidents ${BETWEEN} where hasAnimal = true`,
    `sum trainingHours from carer_training ${BETWEEN} group by trainingType`,
    `count from carer_training ${BETWEEN} where provider = "TAFE NSW"`,
    `count from carer_training ${BETWEEN} where provider = null`,
    `count from hygiene_logs ${BETWEEN} where ppeUsed = 1 group by type`,
    `count from release_checklists ${BETWEEN} group by releaseType`,
    `count from release_checklists ${BETWEEN} where releaseType = soft group by completed`,
    `count from animal_assignments ${BETWEEN} where hasPreviousCarer = true`,
    // Impossible filters short-circuit to an empty result on both paths.
    `count from animals ${BETWEEN} where status = nonsense`,
    `count from incidents ${BETWEEN} where resolved = maybe group by severity`,
    // No between clause: both paths use the trailing one-year window.
    'count from incidents group by severity',
  ];

  for (const query of cases) {
    it(`matches for: ${query}`, async () => {
      await assertParity(query);
    });
  }
});

describe('pushdown planning boundaries', () => {
  const fallbackQueries = [
    // Derived fields → in-memory path.
    'count from animals group by foundMonth',
    'count from animals group by carerName',
    'count from animals where released = true',
    'count from animals group by hasCarer',
    'count from incidents where hasNotes = true',
    'count from carer_training where expired = true',
    'count from assets where hasAssignee = true',
    // Trends are timezone-derived buckets → in-memory path.
    'count from incidents trend by recordedMonth',
    'count from animals group by species trend by foundMonth',
  ];

  for (const query of fallbackQueries) {
    it(`declines to plan: ${query}`, () => {
      const ast = parseCustomQuery(query);
      const source = getCustomQuerySource(ast.source)!;
      expect(planPushdown(ast, source)).toBeNull();
    });
  }

  it('falls back to findMany when the delegate lacks aggregate/groupBy', async () => {
    const { prisma, findManyCalls } = fakePrisma(ROWS, { aggregating: false });
    const result = await evaluateCustomQuery(`count from incidents ${BETWEEN} group by severity`, {
      prisma,
      orgId: ORG,
    });
    expect(result.ok).toBe(true);
    expect(findManyCalls.incidentReport).toHaveLength(1);
  });

  it('pushed-down where references mapped columns only, plus tenant and date scope', async () => {
    const { prisma, groupByCalls } = fakePrisma(ROWS, { aggregating: true });
    await evaluateCustomQuery(`count from animals ${BETWEEN} where status = in_care group by species`, {
      prisma,
      orgId: ORG,
    });
    const args = groupByCalls.animal[0];
    const clauses = (args.where as { AND: Record<string, unknown>[] }).AND;
    expect(clauses).toContainEqual({ clerkOrganizationId: ORG });
    expect(clauses).toContainEqual({ status: 'IN_CARE' });
    const dateClause = clauses.find((c) => 'dateFound' in c) as {
      dateFound: { gte: Date; lte: Date };
    };
    expect(dateClause.dateFound.gte).toBeInstanceOf(Date);
    expect(dateClause.dateFound.lte).toBeInstanceOf(Date);
    // The raw user token never appears as a column key.
    for (const clause of clauses) {
      expect(Object.keys(clause)).not.toContain('in_care');
    }
  });

  it('applies the source baseWhere on the pushed-down path', async () => {
    const { prisma, aggregateCalls } = fakePrisma(ROWS, { aggregating: true });
    await evaluateCustomQuery(`count from animal_assignments ${BETWEEN}`, {
      prisma,
      orgId: ORG,
    });
    const clauses = (aggregateCalls.animalTransfer[0].where as { AND: Record<string, unknown>[] })
      .AND;
    expect(clauses).toContainEqual({ transferType: 'INTERNAL_CARER', toCarerId: { not: null } });
  });

  it('respects the over-long range cap on the pushed-down path', async () => {
    const { prisma } = fakePrisma(ROWS, { aggregating: true });
    const result = await evaluateCustomQuery(
      'count from incidents between 2024-01-01 and 2026-01-01',
      { prisma, orgId: ORG }
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/exceed/i);
  });
});
