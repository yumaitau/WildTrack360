import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

// SHORTCUT: carer relation modelled with passthrough; tighten when carers domain migrated.
const CarerProfileLiteSchema = z.object({ id: z.string() }).passthrough();

export const HygieneLogSchema = z
  .object({
    id: z.string(),
    date: isoDate(),
    type: z.string(),
    description: z.string(),
    completed: z.boolean(),
    enclosureCleaned: z.boolean(),
    ppeUsed: z.boolean(),
    handwashAvailable: z.boolean(),
    feedingBowlsDisinfected: z.boolean(),
    quarantineSignsPresent: z.boolean(),
    photos: z.unknown().nullable(),
    carerId: z.string(),
    notes: z.string().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    carer: CarerProfileLiteSchema,
  })
  .openapi('HygieneLog');

const HygieneLogCreateSchema = z
  .object({
    carerId: z.string().min(1),
    date: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    enclosureCleaned: z.boolean().optional(),
    ppeUsed: z.boolean().optional(),
    handwashAvailable: z.boolean().optional(),
    feedingBowlsDisinfected: z.boolean().optional(),
    quarantineSignsPresent: z.boolean().optional(),
    photos: z.unknown().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('HygieneLogCreate');

const HygieneLogUpdateSchema = z
  .object({
    date: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    enclosureCleaned: z.boolean().optional(),
    ppeUsed: z.boolean().optional(),
    handwashAvailable: z.boolean().optional(),
    feedingBowlsDisinfected: z.boolean().optional(),
    quarantineSignsPresent: z.boolean().optional(),
    photos: z.unknown().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('HygieneLogUpdate');

export const listHygieneLogsContract = defineContract({
  method: 'get',
  path: '/api/hygiene',
  summary: 'List hygiene logs',
  tags: ['Hygiene'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Hygiene log list', schema: z.array(HygieneLogSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createHygieneLogContract = defineContract({
  method: 'post',
  path: '/api/hygiene',
  summary: 'Create a hygiene log entry',
  tags: ['Hygiene'],
  security: 'clerkSession',
  request: { body: HygieneLogCreateSchema },
  responses: {
    201: { description: 'The created hygiene log', schema: HygieneLogSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});

export const getHygieneLogContract = defineContract({
  method: 'get',
  path: '/api/hygiene/{id}',
  summary: 'Get a hygiene log entry',
  tags: ['Hygiene'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The hygiene log', schema: HygieneLogSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateHygieneLogContract = defineContract({
  method: 'patch',
  path: '/api/hygiene/{id}',
  summary: 'Update a hygiene log entry',
  tags: ['Hygiene'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: HygieneLogUpdateSchema },
  responses: {
    200: { description: 'The updated hygiene log', schema: HygieneLogSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteHygieneLogContract = defineContract({
  method: 'delete',
  path: '/api/hygiene/{id}',
  summary: 'Delete a hygiene log entry',
  tags: ['Hygiene'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('HygieneLogDeleted') },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
