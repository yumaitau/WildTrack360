import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

const TransferTypeEnum = z
  .enum(['INTERNAL_CARER', 'INTER_ORGANISATION', 'VET_TRANSFER', 'PERMANENT_CARE_PLACEMENT', 'RELEASE_TRANSFER'])
  .openapi('TransferType');

const AnimalLiteSchema = z.object({ id: z.string(), name: z.string(), species: z.string() }).passthrough().openapi('TransferAnimalLite');

export const AnimalTransferSchema = z
  .object({
    id: z.string(),
    animalId: z.string(),
    transferDate: isoDate(),
    transferType: TransferTypeEnum,
    reasonForTransfer: z.string(),
    fromCarerId: z.string().nullable(),
    toCarerId: z.string().nullable(),
    receivingEntity: z.string(),
    receivingEntityType: z.string().nullable(),
    receivingLicense: z.string().nullable(),
    receivingContactName: z.string().nullable(),
    receivingContactPhone: z.string().nullable(),
    receivingContactEmail: z.string().nullable(),
    receivingOrgAnimalId: z.string().nullable(),
    receivingAuthorityType: z.string().nullable(),
    authorityEvidenceUrl: z.string().nullable(),
    receivingAddress: z.string().nullable(),
    receivingSuburb: z.string().nullable(),
    receivingState: z.string().nullable(),
    receivingPostcode: z.string().nullable(),
    transferAuthorizedBy: z.string().nullable(),
    transferNotes: z.string().nullable(),
    documents: z.unknown().nullable(),
    clerkUserId: z.string(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    animal: AnimalLiteSchema.nullable().optional(),
  })
  .openapi('AnimalTransfer');

const TransferCreateSchema = z
  .object({
    animalId: z.string().min(1),
    transferDate: z.string().min(1),
    reasonForTransfer: z.string().min(1),
    receivingEntity: z.string().min(1),
    transferType: TransferTypeEnum.optional(),
    fromCarerId: z.string().nullable().optional(),
    toCarerId: z.string().nullable().optional(),
    receivingEntityType: z.string().nullable().optional(),
    receivingLicense: z.string().nullable().optional(),
    receivingContactName: z.string().nullable().optional(),
    receivingContactPhone: z.string().nullable().optional(),
    receivingContactEmail: z.string().nullable().optional(),
    receivingOrgAnimalId: z.string().nullable().optional(),
    receivingAuthorityType: z.string().nullable().optional(),
    authorityEvidenceUrl: z.string().nullable().optional(),
    receivingAddress: z.string().nullable().optional(),
    receivingSuburb: z.string().nullable().optional(),
    receivingState: z.string().nullable().optional(),
    receivingPostcode: z.string().nullable().optional(),
    transferAuthorizedBy: z.string().nullable().optional(),
    transferNotes: z.string().nullable().optional(),
    documents: z.unknown().optional(),
  })
  .passthrough()
  .openapi('TransferCreate');

const TransferUpdateSchema = z
  .object({
    transferDate: z.string().optional(),
    transferType: TransferTypeEnum.optional(),
    reasonForTransfer: z.string().optional(),
    fromCarerId: z.string().nullable().optional(),
    toCarerId: z.string().nullable().optional(),
    receivingEntity: z.string().optional(),
    receivingEntityType: z.string().nullable().optional(),
    receivingLicense: z.string().nullable().optional(),
    receivingContactName: z.string().nullable().optional(),
    receivingContactPhone: z.string().nullable().optional(),
    receivingContactEmail: z.string().nullable().optional(),
    receivingOrgAnimalId: z.string().nullable().optional(),
    receivingAuthorityType: z.string().nullable().optional(),
    authorityEvidenceUrl: z.string().nullable().optional(),
    receivingAddress: z.string().nullable().optional(),
    receivingSuburb: z.string().nullable().optional(),
    receivingState: z.string().nullable().optional(),
    receivingPostcode: z.string().nullable().optional(),
    transferAuthorizedBy: z.string().nullable().optional(),
    transferNotes: z.string().nullable().optional(),
    documents: z.unknown().optional(),
  })
  .passthrough()
  .openapi('TransferUpdate');

const TransferCreateResponseSchema = z
  .object({
    transfer: AnimalTransferSchema,
    updatedAnimal: z.unknown(),
  })
  .openapi('TransferCreateResponse');

export const listTransfersContract = defineContract({
  method: 'get',
  path: '/api/transfers',
  summary: 'List animal transfers',
  tags: ['Transfers'],
  security: 'clerkSession',
  request: { query: z.object({ animalId: z.string().optional() }) },
  responses: {
    200: { description: 'Transfer list', schema: z.array(AnimalTransferSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createTransferContract = defineContract({
  method: 'post',
  path: '/api/transfers',
  summary: 'Create an animal transfer',
  tags: ['Transfers'],
  security: 'clerkSession',
  request: { body: TransferCreateSchema },
  responses: {
    201: { description: 'Created transfer', schema: TransferCreateResponseSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
    422: { description: 'Business rule violation' },
  },
  successStatus: 201,
});

export const getTransferContract = defineContract({
  method: 'get',
  path: '/api/transfers/{id}',
  summary: 'Get an animal transfer',
  tags: ['Transfers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The transfer', schema: AnimalTransferSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updateTransferContract = defineContract({
  method: 'patch',
  path: '/api/transfers/{id}',
  summary: 'Update an animal transfer',
  tags: ['Transfers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: TransferUpdateSchema },
  responses: {
    200: { description: 'Updated transfer', schema: AnimalTransferSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const deleteTransferContract = defineContract({
  method: 'delete',
  path: '/api/transfers/{id}',
  summary: 'Delete an animal transfer',
  tags: ['Transfers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', schema: z.object({ ok: z.boolean() }).openapi('TransferDeleted') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});
