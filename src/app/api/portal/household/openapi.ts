import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';
import { PortalOkSchema, CreatedIdSchema } from '../openapi';

const HouseholdMemberSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  clerkUserId: z.string().nullable(),
});

const HouseholdListSchema = z
  .object({ members: z.array(HouseholdMemberSchema) })
  .openapi('HouseholdMembers');

export const getHouseholdContract = defineContract({
  method: 'get',
  path: '/api/portal/household',
  summary: 'List household members',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Household member list', schema: HouseholdListSchema },
    401: { description: 'Unauthorized' },
    403: { description: 'Secondary member or no active membership' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});

export const addHouseholdMemberContract = defineContract({
  method: 'post',
  path: '/api/portal/household',
  summary: 'Add a household member',
  tags: ['Portal'],
  security: 'clerkSession',
  // No request body schema - handler coerces String(body.x ?? '') and lib owns domain 400s.
  responses: {
    200: { description: 'Created household member id', schema: CreatedIdSchema },
    400: { description: 'Validation error from household lib' },
    401: { description: 'Unauthorized' },
    403: { description: 'Secondary member or no active membership' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});

export const removeHouseholdMemberContract = defineContract({
  method: 'delete',
  path: '/api/portal/household',
  summary: 'Remove a household member',
  tags: ['Portal'],
  security: 'clerkSession',
  // id is optional in the schema to preserve handler-owned 'id required' 400 after requirePrimary.
  request: { query: z.object({ id: z.string().optional() }) },
  responses: {
    200: { description: 'Removed', schema: PortalOkSchema },
    400: { description: 'id required or removal failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Secondary member or no active membership' },
    404: { description: 'No membership found' },
  },
  successStatus: 200,
});
