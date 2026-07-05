import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildWallyTools, type WallyToolContext } from './tools';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    speciesGrowthReference: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/carer-helpers', () => ({
  getEnrichedCarers: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

import { prisma } from '@/lib/prisma';

const findManyReference = prisma.speciesGrowthReference.findMany as ReturnType<typeof vi.fn>;

function contextFor(role: WallyToolContext['role']): WallyToolContext {
  return { userId: 'user_1', orgId: 'org_1', role };
}

type ExecutableTool = { execute: (args: unknown, options?: unknown) => Promise<unknown> };

function getTool(tools: ReturnType<typeof buildWallyTools>, name: string): ExecutableTool {
  const candidate = tools[name] as unknown as ExecutableTool;
  expect(candidate?.execute).toBeTypeOf('function');
  return candidate;
}

describe('buildWallyTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the expected tool set', () => {
    const tools = buildWallyTools(contextFor('ADMIN'));
    expect(Object.keys(tools).sort()).toEqual(
      [
        'add_growth_measurement',
        'add_training_record',
        'create_animal',
        'create_care_record',
        'get_animal',
        'growth_calculator',
        'list_animals',
        'list_carers',
        'list_species',
        'list_training_records',
        'run_report_query',
      ].sort()
    );
  });

  it('blocks animal creation for carers with a plain error result', async () => {
    const tools = buildWallyTools(contextFor('CARER'));
    const result = await getTool(tools, 'create_animal').execute({
      name: 'Skippy',
      species: 'Eastern Grey Kangaroo',
    });
    expect(result).toEqual({ error: 'Forbidden: your role (CARER) cannot admit animals' });
  });

  it('blocks the carer list and report queries for carers', async () => {
    const tools = buildWallyTools(contextFor('CARER'));
    expect(await getTool(tools, 'list_carers').execute({})).toEqual({
      error: 'Forbidden: your role (CARER) cannot view the carer list',
    });
    expect(
      await getTool(tools, 'run_report_query').execute({ queries: ['count from animals'] })
    ).toEqual({ error: 'Forbidden: your role (CARER) cannot run report queries' });
  });

  it('blocks carers adding training records for other carers', async () => {
    const tools = buildWallyTools(contextFor('CARER'));
    const result = await getTool(tools, 'add_training_record').execute({
      carerId: 'user_someone_else',
      courseName: 'Rescue Basics',
      date: '2026-07-01',
    });
    expect(result).toEqual({
      error: 'Forbidden: your role (CARER) can only add training records for yourself',
    });
  });

  it('estimates birth dates through the growth calculator', async () => {
    findManyReference.mockResolvedValue([
      { ageDays: 10, weightGrams: 100 },
      { ageDays: 20, weightGrams: 200 },
      { ageDays: 30, weightGrams: 300 },
    ]);
    const tools = buildWallyTools(contextFor('CARER'));
    const result = (await getTool(tools, 'growth_calculator').execute({
      speciesName: 'Eastern Grey Kangaroo',
      measurements: { weightGrams: 150 },
      measurementDate: '2026-07-01',
    })) as {
      birthDateEstimation: { medianEstimatedAgeDays: number; medianEstimatedBirthDate: string };
    };
    expect(result.birthDateEstimation.medianEstimatedAgeDays).toBe(15);
    expect(result.birthDateEstimation.medianEstimatedBirthDate).toBe('2026-06-16');
  });

  it('checks weight for age at a known age', async () => {
    findManyReference.mockResolvedValue([
      { ageDays: 10, weightGrams: 100 },
      { ageDays: 30, weightGrams: 300 },
    ]);
    const tools = buildWallyTools(contextFor('CARER'));
    const result = (await getTool(tools, 'growth_calculator').execute({
      speciesName: 'Eastern Grey Kangaroo',
      ageDays: 20,
      actualWeightGrams: 150,
    })) as {
      weightCheck: { predictedWeightGrams: number; weightForAgeGrams: number; status: string };
    };
    expect(result.weightCheck.predictedWeightGrams).toBe(200);
    expect(result.weightCheck.weightForAgeGrams).toBe(-50);
    expect(result.weightCheck.status).toBe('danger');
  });

  it('lists species with growth data when the requested species has none', async () => {
    findManyReference.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { speciesName: 'Common Ringtail Possum' },
      { speciesName: 'Grey-headed Flying-fox' },
    ]);
    const tools = buildWallyTools(contextFor('CARER'));
    const result = (await getTool(tools, 'growth_calculator').execute({
      speciesName: 'Emu',
      ageDays: 20,
    })) as { error: string };
    expect(result.error).toContain('No growth reference data found for "Emu"');
    expect(result.error).toContain('Common Ringtail Possum, Grey-headed Flying-fox');
  });
});
