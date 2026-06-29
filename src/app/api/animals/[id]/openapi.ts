import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { AnimalSchema, AnimalStatusEnum } from '../openapi';

const idParams = z.object({ id: z.string() });

/**
 * Partial update payload. Common fields are validated when present; `.passthrough()`
 * preserves every other field the handler relies on (e.g. `_overrideValidation`,
 * `orgAnimalId`, other animal columns) so nothing is dropped before updateAnimal.
 */
export const AnimalUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    species: z.string().min(1).optional(),
    status: AnimalStatusEnum.optional(),
    notes: z.string().nullable().optional(),
    orgAnimalId: z.string().optional(),
  })
  .passthrough()
  .openapi('AnimalUpdate');

export const updateAnimalContract = defineContract({
  method: 'patch',
  path: '/api/animals/{id}',
  summary: 'Update an animal',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: idParams, body: AnimalUpdateSchema },
  responses: {
    200: { description: 'The updated animal', schema: AnimalSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
    422: { description: 'Invalid status transition or duplicate orgAnimalId' },
  },
  successStatus: 200,
});

export const deleteAnimalContract = defineContract({
  method: 'delete',
  path: '/api/animals/{id}',
  summary: 'Delete an animal (admin only)',
  tags: ['Animals'],
  security: 'clerkSession',
  request: { params: idParams },
  responses: {
    200: { description: 'Deleted', schema: z.object({ ok: z.boolean() }) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
  },
  successStatus: 200,
});
