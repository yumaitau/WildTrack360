import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

const AnimalLiteSchema = z.object({ id: z.string(), name: z.string(), species: z.string() }).passthrough().openapi('CallLogAnimalLite');

export const CallLogSchema = z
  .object({
    id: z.string(),
    dateTime: isoDate(),
    status: z.string(),
    callerName: z.string().nullable(),
    callerPhone: z.string().nullable(),
    callerEmail: z.string().nullable(),
    species: z.string().nullable(),
    location: z.string().nullable(),
    coordinates: z.unknown().nullable(),
    suburb: z.string().nullable(),
    postcode: z.string().nullable(),
    notes: z.string().nullable(),
    reason: z.string().nullable(),
    referrer: z.string().nullable(),
    action: z.string().nullable(),
    outcome: z.string().nullable(),
    takenByUserId: z.string(),
    takenByUserName: z.string().nullable(),
    assignedToUserId: z.string().nullable(),
    assignedToUserName: z.string().nullable(),
    animalId: z.string().nullable(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    animal: AnimalLiteSchema.nullable().optional(),
  })
  .openapi('CallLog');

const CallLogCreateSchema = z
  .object({
    callerName: z.string(),
    callerPhone: z.string().nullable().optional(),
    callerEmail: z.string().nullable().optional(),
    species: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    coordinates: z.unknown().optional(),
    suburb: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    action: z.string().nullable().optional(),
    outcome: z.string().nullable().optional(),
    status: z.enum(['OPEN', 'CLOSED']).optional(),
    dateTime: z.string().optional(),
    assignedToUserId: z.string().nullable().optional(),
    assignedToUserName: z.string().nullable().optional(),
    animalId: z.string().nullable().optional(),
    pindropSessionId: z.string().optional(),
  })
  .passthrough()
  .openapi('CallLogCreate');

const CallLogUpdateSchema = z
  .object({
    dateTime: z.string().optional(),
    status: z.string().optional(),
    callerName: z.string().nullable().optional(),
    callerPhone: z.string().nullable().optional(),
    callerEmail: z.string().nullable().optional(),
    species: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    coordinates: z.unknown().optional(),
    suburb: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    action: z.string().nullable().optional(),
    outcome: z.string().nullable().optional(),
    assignedToUserId: z.string().nullable().optional(),
    assignedToUserName: z.string().nullable().optional(),
    animalId: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('CallLogUpdate');

export const listCallLogsContract = defineContract({
  method: 'get',
  path: '/api/call-logs',
  summary: 'List call logs',
  tags: ['CallLogs'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Call log list', schema: z.array(CallLogSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createCallLogContract = defineContract({
  method: 'post',
  path: '/api/call-logs',
  summary: 'Create a call log',
  tags: ['CallLogs'],
  security: 'clerkSession',
  request: { body: CallLogCreateSchema },
  responses: {
    201: { description: 'Created call log', schema: CallLogSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});

export const getCallLogContract = defineContract({
  method: 'get',
  path: '/api/call-logs/{id}',
  summary: 'Get a call log',
  tags: ['CallLogs'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The call log', schema: CallLogSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateCallLogContract = defineContract({
  method: 'patch',
  path: '/api/call-logs/{id}',
  summary: 'Update a call log',
  tags: ['CallLogs'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: CallLogUpdateSchema },
  responses: {
    200: { description: 'Updated call log', schema: CallLogSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteCallLogContract = defineContract({
  method: 'delete',
  path: '/api/call-logs/{id}',
  summary: 'Delete a call log',
  tags: ['CallLogs'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('CallLogDeleted') },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
