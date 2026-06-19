import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { isoDate, CreatedIdSchema } from '../openapi';

export const CarerInterestSchema = z
  .object({
    // Non-null
    id: z.string(),
    clerkOrganizationId: z.string(),
    name: z.string(),
    email: z.string(),
    status: z.enum(['NEW', 'CONTACTED', 'APPROVED', 'DECLINED']),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    // Nullable
    memberId: z.string().nullable(),
    phone: z.string().nullable(),
    experience: z.string().nullable(),
    availability: z.string().nullable(),
    message: z.string().nullable(),
  })
  .openapi('CarerInterest');

export const CarerInterestSubmitSchema = z
  .object({
    phone: z.string().optional(),
    experience: z.string().optional(),
    availability: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough()
  .openapi('CarerInterestSubmit');

export const getCarerInterestContract = defineContract({
  method: 'get',
  path: '/api/portal/carer-interest',
  summary: 'Get the current member open carer interest application',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: {
      description: 'Open carer interest or null',
      schema: z.object({ open: CarerInterestSchema.nullable() }).openapi('CarerInterestOpen'),
    },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});

export const submitCarerInterestContract = defineContract({
  method: 'post',
  path: '/api/portal/carer-interest',
  summary: 'Submit a carer interest application',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { body: CarerInterestSubmitSchema },
  responses: {
    200: { description: 'Created carer interest id', schema: CreatedIdSchema },
    400: { description: 'Application already in progress or submission failed' },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});
