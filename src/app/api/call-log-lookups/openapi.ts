import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const LookupTypeEnum = z.enum(['reason', 'referrer', 'action', 'outcome']).openapi('LookupType');

const LookupItemSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    displayOrder: z.number(),
    active: z.boolean(),
    clerkOrganizationId: z.string(),
  })
  .openapi('CallLogLookupItem');

const LookupListSchema = z
  .object({
    reason: z.array(LookupItemSchema).optional(),
    referrer: z.array(LookupItemSchema).optional(),
    action: z.array(LookupItemSchema).optional(),
    outcome: z.array(LookupItemSchema).optional(),
  })
  .openapi('CallLogLookupList');

const LookupCreateSchema = z
  .object({
    type: LookupTypeEnum,
    label: z.string().min(1),
    displayOrder: z.number().optional(),
    active: z.boolean().optional(),
  })
  .passthrough()
  .openapi('CallLogLookupCreate');

const LookupUpdateSchema = z
  .object({
    type: LookupTypeEnum,
    id: z.string().min(1),
    label: z.string().optional(),
    displayOrder: z.number().optional(),
    active: z.boolean().optional(),
  })
  .passthrough()
  .openapi('CallLogLookupUpdate');

export const listLookupsContract = defineContract({
  method: 'get',
  path: '/api/call-log-lookups',
  summary: 'List call log lookup values',
  tags: ['CallLogLookups'],
  security: 'clerkSession',
  request: { query: z.object({ type: LookupTypeEnum.optional() }) },
  responses: {
    200: { description: 'Lookup list', schema: LookupListSchema },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createLookupContract = defineContract({
  method: 'post',
  path: '/api/call-log-lookups',
  summary: 'Create a call log lookup value',
  tags: ['CallLogLookups'],
  security: 'clerkSession',
  request: { body: LookupCreateSchema },
  responses: {
    201: { description: 'Created lookup item', schema: LookupItemSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});

export const updateLookupContract = defineContract({
  method: 'patch',
  path: '/api/call-log-lookups',
  summary: 'Update a call log lookup value',
  tags: ['CallLogLookups'],
  security: 'clerkSession',
  request: { body: LookupUpdateSchema },
  responses: {
    200: { description: 'Updated lookup item', schema: LookupItemSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteLookupContract = defineContract({
  method: 'delete',
  path: '/api/call-log-lookups',
  summary: 'Delete a call log lookup value',
  tags: ['CallLogLookups'],
  security: 'clerkSession',
  request: { query: z.object({ type: LookupTypeEnum, id: z.string().min(1) }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('LookupDeleted') },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const seedLookupsContract = defineContract({
  method: 'post',
  path: '/api/call-log-lookups/seed-defaults',
  summary: 'Seed default call log lookup values',
  tags: ['CallLogLookups'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Already seeded', schema: z.object({ message: z.string() }).openapi('LookupSeedSkipped') },
    201: { description: 'Seeded', schema: z.object({ message: z.string() }).openapi('LookupSeeded') },
  },
  successStatus: 201,
});
