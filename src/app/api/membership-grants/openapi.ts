import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

export const grantMembershipContract = defineContract({
  method: 'post',
  path: '/api/membership-grants',
  summary: 'Grant a complimentary membership to a member',
  tags: ['Memberships'],
  security: 'clerkSession',
  request: {
    body: z.object({
      memberId: z.string(),
      tierId: z.string(),
      giftedBy: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Grant result', schema: z.object({}).passthrough() },
  },
  successStatus: 200,
});
