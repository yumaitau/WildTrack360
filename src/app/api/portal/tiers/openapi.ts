import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

const PortalTierSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    amountCents: z.number().int(),
    currency: z.string(),
    billingInterval: z.enum(['ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME']),
    benefits: z.array(z.unknown()),
  })
  .openapi('PortalTier');

export const listPortalTiersContract = defineContract({
  method: 'get',
  path: '/api/portal/tiers',
  summary: 'List active membership tiers for the organisation',
  tags: ['Portal'],
  security: 'clerkSession',
  responses: {
    200: { description: 'Tier list', schema: z.array(PortalTierSchema) },
    401: { description: 'Unauthorized' },
    404: { description: 'No membership or feature not enabled' },
  },
  successStatus: 200,
});
