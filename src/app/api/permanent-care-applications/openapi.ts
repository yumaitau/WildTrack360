import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const isoDate = () => z.string().openapi({ format: 'date-time' });

const PCAStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).openapi('PCAStatus');

const AnimalLiteSchema = z.object({ id: z.string(), name: z.string(), species: z.string() }).passthrough().openapi('PCAnimalLite');

export const PermanentCareApplicationSchema = z
  .object({
    id: z.string(),
    animalId: z.string(),
    status: PCAStatusEnum,
    createdByUserId: z.string(),
    submittedByUserId: z.string().nullable(),
    submittedAt: isoDate().nullable(),
    nonReleasableReasons: z.string(),
    euthanasiaJustification: z.string(),
    vetReportUrl: z.string().nullable(),
    vetName: z.string().nullable(),
    vetClinic: z.string().nullable(),
    vetContact: z.string().nullable(),
    keeperName: z.string().nullable(),
    facilityName: z.string().nullable(),
    facilityAddress: z.string().nullable(),
    facilitySuburb: z.string().nullable(),
    facilityState: z.string(),
    facilityPostcode: z.string().nullable(),
    category: z.string().nullable(),
    notes: z.string().nullable(),
    npwsApprovalNumber: z.string().nullable(),
    npwsApprovalDate: isoDate().nullable(),
    rejectionReason: z.string().nullable(),
    reviewedByUserId: z.string().nullable(),
    reviewedAt: isoDate().nullable(),
    clerkOrganizationId: z.string(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    animal: AnimalLiteSchema.nullable().optional(),
  })
  .openapi('PermanentCareApplication');

const PCACreateSchema = z
  .object({
    animalId: z.string().min(1),
    nonReleasableReasons: z.string().min(1),
    euthanasiaJustification: z.string().min(1),
    submitNow: z.boolean().optional(),
    vetReportUrl: z.string().nullable().optional(),
    vetName: z.string().nullable().optional(),
    vetClinic: z.string().nullable().optional(),
    vetContact: z.string().nullable().optional(),
    keeperName: z.string().nullable().optional(),
    facilityName: z.string().nullable().optional(),
    facilityAddress: z.string().nullable().optional(),
    facilitySuburb: z.string().nullable().optional(),
    facilityState: z.string().optional(),
    facilityPostcode: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('PermanentCareApplicationCreate');

const PCAUpdateSchema = z
  .object({
    action: z.enum(['submit', 'approve', 'reject']).optional(),
    nonReleasableReasons: z.string().optional(),
    euthanasiaJustification: z.string().optional(),
    vetReportUrl: z.string().nullable().optional(),
    vetName: z.string().nullable().optional(),
    vetClinic: z.string().nullable().optional(),
    vetContact: z.string().nullable().optional(),
    keeperName: z.string().nullable().optional(),
    facilityName: z.string().nullable().optional(),
    facilityAddress: z.string().nullable().optional(),
    facilitySuburb: z.string().nullable().optional(),
    facilityState: z.string().optional(),
    facilityPostcode: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    npwsApprovalNumber: z.string().optional(),
    npwsApprovalDate: z.string().optional(),
    rejectionReason: z.string().optional(),
  })
  .passthrough()
  .openapi('PermanentCareApplicationUpdate');

export const listPCAContract = defineContract({
  method: 'get',
  path: '/api/permanent-care-applications',
  summary: 'List permanent care applications',
  tags: ['PermanentCareApplications'],
  security: 'clerkSession',
  request: { query: z.object({ animalId: z.string().optional() }) },
  responses: {
    200: { description: 'Application list', schema: z.array(PermanentCareApplicationSchema) },
    401: { description: 'Unauthorized' },
  },
  successStatus: 200,
});

export const createPCAContract = defineContract({
  method: 'post',
  path: '/api/permanent-care-applications',
  summary: 'Create a permanent care application',
  tags: ['PermanentCareApplications'],
  security: 'clerkSession',
  request: { body: PCACreateSchema },
  responses: {
    201: { description: 'Created application', schema: PermanentCareApplicationSchema },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Animal not found' },
    422: { description: 'Business rule violation' },
  },
  successStatus: 201,
});

export const getPCAContract = defineContract({
  method: 'get',
  path: '/api/permanent-care-applications/{id}',
  summary: 'Get a permanent care application',
  tags: ['PermanentCareApplications'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'The application', schema: PermanentCareApplicationSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'Not found' },
  },
  successStatus: 200,
});

export const updatePCAContract = defineContract({
  method: 'patch',
  path: '/api/permanent-care-applications/{id}',
  summary: 'Update or action a permanent care application',
  tags: ['PermanentCareApplications'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: PCAUpdateSchema },
  responses: {
    200: { description: 'Updated application', schema: z.unknown() },
    400: { description: 'Invalid request body' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
    409: { description: 'Conflict' },
    422: { description: 'Business rule violation' },
  },
  successStatus: 200,
});
