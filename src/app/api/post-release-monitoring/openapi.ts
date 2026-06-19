import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

const AnimalLiteSchema = z.object({ name: z.string(), species: z.string() }).passthrough().openapi('PRMAnimalLite');

export const PostReleaseMonitoringSchema = z
  .object({
    id: z.string(),
    animalId: z.string(),
    date: isoDate(),
    time: z.string().nullable(),
    location: z.string().nullable(),
    coordinates: z.unknown().nullable(),
    animalCondition: z.string().nullable(),
    notes: z.string(),
    photos: z.unknown().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    animal: AnimalLiteSchema.nullable().optional(),
  })
  .openapi('PostReleaseMonitoring');

const PRMCreateSchema = z
  .object({
    animalId: z.string().min(1),
    notes: z.string().min(1),
    date: z.string().optional(),
    time: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    coordinates: z.unknown().optional(),
    animalCondition: z.string().nullable().optional(),
    photos: z.unknown().optional(),
  })
  .passthrough()
  .openapi('PostReleaseMonitoringCreate');

const PRMUpdateSchema = z
  .object({
    date: z.string().optional(),
    time: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    coordinates: z.unknown().optional(),
    animalCondition: z.string().nullable().optional(),
    notes: z.string().optional(),
    photos: z.unknown().optional(),
  })
  .passthrough()
  .openapi('PostReleaseMonitoringUpdate');

export const listPRMContract = defineContract({
  method: 'get',
  path: '/api/post-release-monitoring',
  summary: 'List post-release monitoring records',
  tags: ['PostReleaseMonitoring'],
  security: 'clerkSession',
  request: { query: z.object({ animalId: z.string().optional() }) },
  responses: {
    200: { description: 'Record list', schema: z.array(PostReleaseMonitoringSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createPRMContract = defineContract({
  method: 'post',
  path: '/api/post-release-monitoring',
  summary: 'Create a post-release monitoring record',
  tags: ['PostReleaseMonitoring'],
  security: 'clerkSession',
  request: { body: PRMCreateSchema },
  responses: {
    201: { description: 'Created record', schema: PostReleaseMonitoringSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
  },
  successStatus: 201,
});

export const getPRMContract = defineContract({
  method: 'get',
  path: '/api/post-release-monitoring/{id}',
  summary: 'Get a post-release monitoring record',
  tags: ['PostReleaseMonitoring'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The record', schema: PostReleaseMonitoringSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updatePRMContract = defineContract({
  method: 'patch',
  path: '/api/post-release-monitoring/{id}',
  summary: 'Update a post-release monitoring record',
  tags: ['PostReleaseMonitoring'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: PRMUpdateSchema },
  responses: {
    200: { description: 'Updated record', schema: PostReleaseMonitoringSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deletePRMContract = defineContract({
  method: 'delete',
  path: '/api/post-release-monitoring/{id}',
  summary: 'Delete a post-release monitoring record',
  tags: ['PostReleaseMonitoring'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('PRMDeleted') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
