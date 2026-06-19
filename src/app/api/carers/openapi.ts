import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const EnrichedCarerSchema = z.object({}).passthrough().openapi('EnrichedCarer');

const CarerProfileBodySchema = z.object({}).passthrough().openapi('CarerProfileBody');

const CarerMapEntrySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string(),
    specialties: z.array(z.string()),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    streetAddress: z.string().nullable(),
    activeAnimalCount: z.number(),
    lat: z.number(),
    lng: z.number(),
  })
  .openapi('CarerMapEntry');

export const listCarersContract = defineContract({
  method: 'get',
  path: '/api/carers',
  summary: 'List enriched carers for the organisation',
  tags: ['Carers'],
  security: 'clerkSession',
  request: {
    query: z.object({
      species: z.string().optional(),
      assignable: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Carer list', schema: z.array(EnrichedCarerSchema) },
    400: { description: 'Organization ID required' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const getCarerContract = defineContract({
  method: 'get',
  path: '/api/carers/{id}',
  summary: 'Get an enriched carer profile',
  tags: ['Carers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The carer', schema: EnrichedCarerSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateCarerContract = defineContract({
  method: 'patch',
  path: '/api/carers/{id}',
  summary: 'Update a carer profile',
  tags: ['Carers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: CarerProfileBodySchema },
  responses: {
    200: { description: 'Updated profile', schema: z.object({}).passthrough().openapi('CarerProfile') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});

export const carerMapContract = defineContract({
  method: 'get',
  path: '/api/carers/map',
  summary: 'Get geocoded carer locations for the map',
  tags: ['Carers'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Carer map entries', schema: z.array(CarerMapEntrySchema) },
    400: { description: 'Organization ID required' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});
