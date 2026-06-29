import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

// SHORTCUT: carer relation modelled with id only; tighten when carers domain migrated.
const CarerLiteSchema = z.object({ id: z.string() });

export const CarerTrainingSchema = z
  .object({
    id: z.string(),
    carerId: z.string(),
    courseName: z.string(),
    provider: z.string().nullable(),
    date: isoDate(),
    expiryDate: isoDate().nullable(),
    certificateUrl: z.string().nullable(),
    certificateNumber: z.string().nullable(),
    trainingType: z.string().nullable(),
    trainingHours: z.number().int().nullable(),
    notes: z.string().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    carer: CarerLiteSchema,
  })
  .openapi('CarerTraining');

const CarerTrainingCreateSchema = z
  .object({
    carerId: z.string().min(1),
    courseName: z.string().min(1),
    date: z.string().min(1),
    provider: z.string().nullable().optional(),
    expiryDate: z.string().nullable().optional(),
    certificateUrl: z.string().nullable().optional(),
    certificateNumber: z.string().nullable().optional(),
    trainingType: z.string().nullable().optional(),
    trainingHours: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('CarerTrainingCreate');

const CarerTrainingUpdateSchema = z
  .object({
    courseName: z.string().optional(),
    provider: z.string().nullable().optional(),
    date: z.string().optional(),
    expiryDate: z.string().nullable().optional(),
    certificateUrl: z.string().nullable().optional(),
    certificateNumber: z.string().nullable().optional(),
    trainingType: z.string().nullable().optional(),
    trainingHours: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('CarerTrainingUpdate');

const CarerTrainingQuerySchema = z.object({
  carerId: z.string().optional(),
});

export const listCarerTrainingsContract = defineContract({
  method: 'get',
  path: '/api/carer-training',
  summary: 'List carer trainings',
  tags: ['CarerTraining'],
  security: 'clerkSession',
  request: { query: CarerTrainingQuerySchema },
  responses: {
    200: { description: 'Training list', schema: z.array(CarerTrainingSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createCarerTrainingContract = defineContract({
  method: 'post',
  path: '/api/carer-training',
  summary: 'Create a carer training record',
  tags: ['CarerTraining'],
  security: 'clerkSession',
  request: { body: CarerTrainingCreateSchema },
  responses: {
    201: { description: 'The created training', schema: CarerTrainingSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    404: { description: 'Carer not found' },
  },
  successStatus: 201,
});

export const getCarerTrainingContract = defineContract({
  method: 'get',
  path: '/api/carer-training/{id}',
  summary: 'Get a carer training record',
  tags: ['CarerTraining'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The training record', schema: CarerTrainingSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateCarerTrainingContract = defineContract({
  method: 'patch',
  path: '/api/carer-training/{id}',
  summary: 'Update a carer training record',
  tags: ['CarerTraining'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: CarerTrainingUpdateSchema },
  responses: {
    200: { description: 'The updated training', schema: CarerTrainingSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteCarerTrainingContract = defineContract({
  method: 'delete',
  path: '/api/carer-training/{id}',
  summary: 'Delete a carer training record',
  tags: ['CarerTraining'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('CarerTrainingDeleted') },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
