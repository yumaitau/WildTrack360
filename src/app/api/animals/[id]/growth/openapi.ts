import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });
const mm = () => z.number().nullable();

/** Serialised Prisma GrowthMeasurement. Mirrors prisma/schema.prisma model GrowthMeasurement. */
export const GrowthMeasurementSchema = z
  .object({
    id: z.string(),
    animalId: z.string(),
    date: isoDate(),
    weightGrams: mm(),
    headLengthMm: mm(),
    earLengthMm: mm(),
    armLengthMm: mm(),
    legLengthMm: mm(),
    footLengthMm: mm(),
    tailLengthMm: mm(),
    bodyLengthMm: mm(),
    wingLengthMm: mm(),
    notes: z.string().nullable(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
  })
  .openapi('GrowthMeasurement');

const GrowthCreateSchema = z
  .object({
    date: z.string().min(1).openapi({ format: 'date-time' }),
    weightGrams: z.number().nullable().optional(),
    headLengthMm: z.number().nullable().optional(),
    earLengthMm: z.number().nullable().optional(),
    armLengthMm: z.number().nullable().optional(),
    legLengthMm: z.number().nullable().optional(),
    footLengthMm: z.number().nullable().optional(),
    tailLengthMm: z.number().nullable().optional(),
    bodyLengthMm: z.number().nullable().optional(),
    wingLengthMm: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('GrowthMeasurementCreate');

const idParams = z.object({ id: z.string() });

export const listGrowthContract = defineContract({
  method: 'get',
  path: '/api/animals/{id}/growth',
  summary: 'List growth measurements for an animal',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: idParams },
  responses: {
    200: { description: 'Growth measurements (oldest first)', schema: z.array(GrowthMeasurementSchema) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
  },
  successStatus: 200,
});

export const createGrowthContract = defineContract({
  method: 'post',
  path: '/api/animals/{id}/growth',
  summary: 'Add a growth measurement',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: idParams, body: GrowthCreateSchema },
  responses: {
    201: { description: 'The created measurement', schema: GrowthMeasurementSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
  },
  successStatus: 201,
});
