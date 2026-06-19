import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const GrowthReferenceSchema = z
  .object({
    id: z.string(),
    speciesName: z.string(),
    sex: z.string().nullable(),
    ageDays: z.number(),
    weightGrams: z.number().nullable(),
    headBodyLengthMm: z.number().nullable(),
    tailLengthMm: z.number().nullable(),
    hindFootLengthMm: z.number().nullable(),
    earLengthMm: z.number().nullable(),
  })
  .passthrough()
  .openapi('GrowthReference');

const BirthDateEstimateSchema = z
  .object({
    estimates: z.array(
      z.object({
        field: z.string(),
        label: z.string(),
        value: z.number(),
        estimatedAgeDays: z.number(),
        estimatedBirthDate: z.string(),
      })
    ),
    medianEstimatedBirthDate: z.string().nullable(),
    medianEstimatedAgeDays: z.number().nullable(),
  })
  .openapi('BirthDateEstimate');

const EstimateBirthDateBodySchema = z
  .object({
    speciesName: z.string().min(1),
    measurementDate: z.string().min(1),
    measurements: z.record(z.number()),
    sex: z.string().optional(),
  })
  .passthrough()
  .openapi('EstimateBirthDateBody');

export const listGrowthReferencesContract = defineContract({
  method: 'get',
  path: '/api/growth-references',
  summary: 'List growth reference data for a species',
  tags: ['GrowthReferences'],
  security: 'clerkSession',
  request: {
    query: z.object({
      speciesName: z.string().min(1),
      sex: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Growth reference list', schema: z.array(GrowthReferenceSchema) },
    400: { description: 'speciesName is required' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const listGrowthReferenceSpeciesContract = defineContract({
  method: 'get',
  path: '/api/growth-references/species',
  summary: 'List species that have growth reference data',
  tags: ['GrowthReferences'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Species name list', schema: z.array(z.string()) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const estimateBirthDateContract = defineContract({
  method: 'post',
  path: '/api/growth-references/estimate-birth-date',
  summary: 'Estimate birth date from growth measurements',
  tags: ['GrowthReferences'],
  security: 'clerkSession',
  request: { body: EstimateBirthDateBodySchema },
  responses: {
    200: { description: 'Birth date estimates', schema: BirthDateEstimateSchema },
    400: { description: 'Missing required fields' },
    401: { description: 'Unauthorized' },
    404: { description: 'No growth reference data for species' },
  },
  successStatus: 200,
});
