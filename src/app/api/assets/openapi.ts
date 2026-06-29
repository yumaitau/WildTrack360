import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

const AssetStatusEnum = z
  .enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST'])
  .openapi('AssetStatus');

export const AssetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    status: AssetStatusEnum,
    description: z.string().nullable(),
    location: z.string().nullable(),
    assignedTo: z.string().nullable(),
    purchaseDate: isoDate().nullable(),
    lastMaintenance: isoDate().nullable(),
    notes: z.string().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
  })
  .openapi('Asset');

const AssetCreateSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
    status: AssetStatusEnum,
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    assignedTo: z.string().nullable().optional(),
    purchaseDate: z.string().nullable().optional(),
    lastMaintenance: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('AssetCreate');

const AssetUpdateSchema = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    status: AssetStatusEnum.optional(),
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    assignedTo: z.string().nullable().optional(),
    purchaseDate: z.string().nullable().optional(),
    lastMaintenance: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('AssetUpdate');

const OkSchema = z.object({ ok: z.boolean() }).openapi('AssetOk');

export const listAssetsContract = defineContract({
  method: 'get',
  path: '/api/assets',
  summary: 'List assets for the organisation',
  tags: ['Assets'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Asset list', schema: z.array(AssetSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createAssetContract = defineContract({
  method: 'post',
  path: '/api/assets',
  summary: 'Create an asset',
  tags: ['Assets'],
  security: 'clerkSession',
  request: { body: AssetCreateSchema },
  responses: {
    201: { description: 'The created asset', schema: AssetSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
  },
  successStatus: 201,
});

export const updateAssetContract = defineContract({
  method: 'patch',
  path: '/api/assets/{id}',
  summary: 'Update an asset',
  tags: ['Assets'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: AssetUpdateSchema },
  responses: {
    200: { description: 'The updated asset', schema: AssetSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    404: { description: 'Asset not found' },
  },
  successStatus: 200,
});

export const deleteAssetContract = defineContract({
  method: 'delete',
  path: '/api/assets/{id}',
  summary: 'Delete an asset',
  tags: ['Assets'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: OkSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Asset not found' },
  },
  successStatus: 200,
});
