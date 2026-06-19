import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

export const SpeciesSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    scientificName: z.string().nullable(),
    type: z.string().nullable(),
    description: z.string().nullable(),
    careRequirements: z.string().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
  })
  .openapi('Species');

const SpeciesCreateSchema = z
  .object({
    name: z.string().min(1),
    scientificName: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    careRequirements: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('SpeciesCreate');

const SpeciesRenameSchema = z
  .object({ oldName: z.string().min(1), newName: z.string().min(1) })
  .openapi('SpeciesRename');

const SpeciesDeleteByNameSchema = z
  .object({ name: z.string().min(1) })
  .openapi('SpeciesDeleteByName');

const SpeciesUpdateSchema = z
  .object({
    name: z.string().optional(),
    scientificName: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    careRequirements: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('SpeciesUpdate');

const BulkDeleteSchema = z
  .object({ ids: z.array(z.string().min(1)).min(1) })
  .openapi('SpeciesBulkDelete');

const BulkDeleteResultSchema = z
  .object({ deleted: z.number(), message: z.string() })
  .openapi('SpeciesBulkDeleteResult');

const SeedResultSchema = z
  .object({ inserted: z.number(), message: z.string() })
  .openapi('SpeciesSeedResult');

export const listSpeciesContract = defineContract({
  method: 'get',
  path: '/api/species',
  summary: 'List species for the organisation',
  tags: ['Species'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Species list', schema: z.array(SpeciesSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createSpeciesContract = defineContract({
  method: 'post',
  path: '/api/species',
  summary: 'Create a species',
  tags: ['Species'],
  security: 'clerkSession',
  request: { body: SpeciesCreateSchema },
  responses: {
    201: { description: 'Created species', schema: SpeciesSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});

export const renameSpeciesContract = defineContract({
  method: 'patch',
  path: '/api/species',
  summary: 'Rename a species by name (bulk)',
  tags: ['Species'],
  security: 'clerkSession',
  request: { body: SpeciesRenameSchema },
  responses: {
    200: { description: 'Update count', schema: z.object({ count: z.number() }).openapi('SpeciesRenameResult') },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const deleteSpeciesByNameContract = defineContract({
  method: 'delete',
  path: '/api/species',
  summary: 'Delete species by name (bulk)',
  tags: ['Species'],
  security: 'clerkSession',
  request: { body: SpeciesDeleteByNameSchema },
  responses: {
    200: { description: 'Delete count', schema: z.object({ count: z.number() }).openapi('SpeciesDeleteByNameResult') },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const getSpeciesByIdContract = defineContract({
  method: 'get',
  path: '/api/species/{id}',
  summary: 'Get a species by ID',
  tags: ['Species'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The species', schema: SpeciesSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateSpeciesByIdContract = defineContract({
  method: 'patch',
  path: '/api/species/{id}',
  summary: 'Update a species by ID',
  tags: ['Species'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: SpeciesUpdateSchema },
  responses: {
    200: { description: 'Updated species', schema: SpeciesSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteSpeciesByIdContract = defineContract({
  method: 'delete',
  path: '/api/species/{id}',
  summary: 'Delete a species by ID',
  tags: ['Species'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ success: z.boolean() }).openapi('SpeciesDeletedById') },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const bulkDeleteSpeciesContract = defineContract({
  method: 'post',
  path: '/api/species/bulk-delete',
  summary: 'Bulk delete species by IDs',
  tags: ['Species'],
  security: 'clerkSession',
  request: { body: BulkDeleteSchema },
  responses: {
    200: { description: 'Bulk delete result', schema: BulkDeleteResultSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const seedSpeciesContract = defineContract({
  method: 'post',
  path: '/api/species/seed',
  summary: 'Seed default species for the organisation',
  tags: ['Species'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Already seeded', schema: SeedResultSchema },
    201: { description: 'Seeded', schema: SeedResultSchema },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});
