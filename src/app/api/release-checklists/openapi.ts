import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

export const ReleaseChecklistSchema = z
  .object({
    id: z.string(),
    releaseDate: isoDate(),
    animalId: z.string(),
    releaseLocation: z.string().nullable(),
    releaseCoordinates: z.unknown().nullable(),
    within10km: z.boolean(),
    releaseType: z.string().nullable(),
    fitnessIndicators: z.unknown(),
    vetSignOff: z.boolean().nullable(),
    photos: z.unknown().nullable(),
    completed: z.boolean(),
    notes: z.string().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
  })
  .openapi('ReleaseChecklist');

const ReleaseChecklistCreateSchema = z
  .object({
    releaseDate: z.string().min(1),
    animalId: z.string().min(1),
    releaseLocation: z.string().nullable().optional(),
    releaseCoordinates: z.unknown().optional(),
    within10km: z.boolean().optional(),
    releaseType: z.string().nullable().optional(),
    fitnessIndicators: z.unknown().optional(),
    vetSignOff: z.boolean().nullable().optional(),
    photos: z.unknown().optional(),
    completed: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('ReleaseChecklistCreate');

export const listReleaseChecklistsContract = defineContract({
  method: 'get',
  path: '/api/release-checklists',
  summary: 'List release checklists',
  tags: ['ReleaseChecklists'],
  security: 'clerkSession',
  request: {
    query: z.object({
      animalId: z.string().optional(),
      completed: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Checklist list', schema: z.array(ReleaseChecklistSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createReleaseChecklistContract = defineContract({
  method: 'post',
  path: '/api/release-checklists',
  summary: 'Create a release checklist',
  tags: ['ReleaseChecklists'],
  security: 'clerkSession',
  request: { body: ReleaseChecklistCreateSchema },
  responses: {
    201: { description: 'Created checklist', schema: ReleaseChecklistSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});
