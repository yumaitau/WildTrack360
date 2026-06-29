import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

const IncidentSeverityEnum = z
  .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  .openapi('IncidentSeverity');

export const IncidentSchema = z
  .object({
    id: z.string(),
    date: isoDate(),
    type: z.string(),
    description: z.string(),
    severity: IncidentSeverityEnum,
    resolved: z.boolean(),
    resolution: z.string().nullable(),
    personInvolved: z.string().nullable(),
    reportedTo: z.string().nullable(),
    actionTaken: z.string().nullable(),
    location: z.string().nullable(),
    animalId: z.string().nullable(),
    notes: z.string().nullable(),
    attachments: z.unknown().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
  })
  .openapi('Incident');

const IncidentCreateSchema = z
  .object({
    type: z.string().min(1),
    description: z.string().min(1),
    severity: IncidentSeverityEnum,
    date: z.string().optional(),
    resolved: z.boolean().optional(),
    resolution: z.string().nullable().optional(),
    personInvolved: z.string().nullable().optional(),
    reportedTo: z.string().nullable().optional(),
    actionTaken: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    animalId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('IncidentCreate');

const IncidentUpdateSchema = z
  .object({
    date: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    severity: IncidentSeverityEnum.optional(),
    resolved: z.boolean().optional(),
    resolution: z.string().nullable().optional(),
    personInvolved: z.string().nullable().optional(),
    reportedTo: z.string().nullable().optional(),
    actionTaken: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    animalId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('IncidentUpdate');

export const listIncidentsContract = defineContract({
  method: 'get',
  path: '/api/incidents',
  summary: 'List incident reports',
  tags: ['Incidents'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Incident list', schema: z.array(IncidentSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createIncidentContract = defineContract({
  method: 'post',
  path: '/api/incidents',
  summary: 'Create an incident report',
  tags: ['Incidents'],
  security: 'clerkSession',
  request: { body: IncidentCreateSchema },
  responses: {
    201: { description: 'The created incident', schema: IncidentSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});

export const getIncidentContract = defineContract({
  method: 'get',
  path: '/api/incidents/{id}',
  summary: 'Get an incident report',
  tags: ['Incidents'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The incident', schema: IncidentSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateIncidentContract = defineContract({
  method: 'patch',
  path: '/api/incidents/{id}',
  summary: 'Update an incident report',
  tags: ['Incidents'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: IncidentUpdateSchema },
  responses: {
    200: { description: 'The updated incident', schema: IncidentSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteIncidentContract = defineContract({
  method: 'delete',
  path: '/api/incidents/{id}',
  summary: 'Delete an incident report',
  tags: ['Incidents'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('IncidentDeleted') },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
