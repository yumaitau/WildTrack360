import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { isoDate } from '../openapi';

export const PortalMeSchema = z
  .object({
    // Non-null (9)
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    country: z.string(),
    status: z.enum(['ACTIVE', 'LAPSED', 'CANCELLED', 'DECEASED']),
    joinedAt: isoDate(),
    clerkOrganizationId: z.string(),
    customFieldsJson: z.unknown(),
    // Nullable (7)
    phone: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    memberNumber: z.string().nullable(),
  })
  .openapi('PortalMe');

export const PortalProfileUpdateSchema = z
  .object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    suburb: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('PortalProfileUpdate');

export const getPortalMeContract = defineContract({
  method: 'get',
  path: '/api/portal/me',
  summary: 'Get the current portal member profile',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Portal member profile', schema: PortalMeSchema },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});

export const updatePortalMeContract = defineContract({
  method: 'patch',
  path: '/api/portal/me',
  summary: 'Update the current portal member profile',
  tags: ['Portal'],
  security: 'clerkSession',
  request: { body: PortalProfileUpdateSchema },
  responses: {
    200: { description: 'Updated portal member profile', schema: PortalMeSchema },
    400: { description: 'No editable fields supplied or update failed' },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});
