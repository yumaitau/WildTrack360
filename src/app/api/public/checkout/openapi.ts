import { z } from 'zod';
import { defineContract } from '@/lib/openapi/contract';

// No request.body declared on either contract: handlers read request.json()
// themselves and enforce a specific 404-before-400 validation order.
// Wrapping with Zod body validation would collapse that ordering (PRD forbids it).

export const publicCheckoutDonationContract = defineContract({
  method: 'post',
  path: '/api/public/checkout/donation',
  summary: 'Submit a one-off donation payment (public, no auth). Body: { handle, amountCents, donorName?, donorEmail, message?, isAnonymous?, sourceId, verificationToken? }.',
  tags: ['Public Checkout'],
  security: 'public',
  responses: {
    200: { description: 'Payment succeeded', schema: z.object({}).passthrough() },
    400: { description: 'Validation error or payment failure', schema: z.object({ error: z.string() }) },
    404: { description: 'Organisation not found', schema: z.object({ error: z.string() }) },
  },
  successStatus: 200,
});

export const publicCheckoutMembershipContract = defineContract({
  method: 'post',
  path: '/api/public/checkout/membership',
  summary: 'Submit a membership signup and payment (public, no auth). Body: { handle, tierId, coverFees?, sourceId, verificationToken?, member: { firstName, lastName, email, ... } }.',
  tags: ['Public Checkout'],
  security: 'public',
  responses: {
    200: { description: 'Membership created and payment succeeded', schema: z.object({}).passthrough() },
    400: { description: 'Validation error or payment failure', schema: z.object({ error: z.string() }) },
    404: { description: 'Organisation or tier not found', schema: z.object({ error: z.string() }) },
  },
  successStatus: 200,
});
