import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const MembershipTierSchema = z.object({}).passthrough().openapi('MembershipTier');

const MembershipTierBodySchema = z.object({}).passthrough().openapi('MembershipTierBody');

export const listTiersContract = defineContract({
  method: 'get',
  path: '/api/membership-tiers',
  summary: 'List membership tiers for the organisation',
  tags: ['MembershipTiers'],
  security: 'clerkSession',
  request: {
    query: z.object({ includeArchived: z.string().optional() }),
  },
  responses: {
    200: { description: 'Tier list', schema: z.array(MembershipTierSchema) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 200,
});

export const createTierContract = defineContract({
  method: 'post',
  path: '/api/membership-tiers',
  summary: 'Create a membership tier',
  tags: ['MembershipTiers'],
  security: 'clerkSession',
  request: { body: MembershipTierBodySchema },
  responses: {
    201: { description: 'Created tier', schema: MembershipTierSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
  successStatus: 201,
});

export const updateTierContract = defineContract({
  method: 'patch',
  path: '/api/membership-tiers/{id}',
  summary: 'Update a membership tier',
  tags: ['MembershipTiers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }), body: MembershipTierBodySchema },
  responses: {
    200: { description: 'Updated tier', schema: MembershipTierSchema },
    400: { description: 'Invalid request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Tier not found' },
  },
  successStatus: 200,
});

export const deleteTierContract = defineContract({
  method: 'delete',
  path: '/api/membership-tiers/{id}',
  summary: 'Archive a membership tier',
  tags: ['MembershipTiers'],
  security: 'clerkSession',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Archived', schema: z.object({ ok: z.boolean() }).openapi('TierArchived') },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Tier not found' },
  },
  successStatus: 200,
});
