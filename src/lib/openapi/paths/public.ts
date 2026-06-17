import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';

import { security } from '../security';
import { errorResponses, ok200, mergeResponses } from '../responses';

const DonationResult = z
  .object({
    paymentId: z.string().openapi({ description: 'Square payment ID' }),
    status: z.string().openapi({ description: 'Payment status from Square' }),
  })
  .openapi({ ref: 'DonationResult', description: 'Result of a successful donation payment' });

const DonationBody = z
  .object({
    handle: z.string().openapi({ description: 'Organisation subdomain handle (identifies which org receives the donation)' }),
    amountCents: z
      .number()
      .int()
      .positive()
      .openapi({ description: 'Donation amount in cents (e.g. 1000 = $10.00 AUD). Integer only - no decimals.' }),
    donorName: z.string().nullable().optional(),
    donorEmail: z.string().email(),
    message: z.string().nullable().optional(),
    isAnonymous: z.boolean().optional().openapi({ description: 'If true, donor name is hidden from org dashboard' }),
    sourceId: z.string().openapi({ description: 'Square payment source nonce from the Web Payments SDK card form' }),
    verificationToken: z.string().nullable().optional().openapi({ description: 'Square 3DS verification token' }),
  })
  .openapi({ ref: 'DonationBody', description: 'Public donation request' });

export const publicPaths: ZodOpenApiPathsObject = {
  '/api/public/checkout/membership': {
    post: {
      operationId: 'publicCheckoutMembership',
      tags: ['Public Checkout'],
      summary: 'Public membership purchase (no Clerk session required)',
      description:
        'Unauthenticated endpoint. The receiving organisation is resolved from the org handle in the body. ' +
        'Creates or updates a Member record, charges via Square, and emails a receipt.',
      security: security.public as unknown as Record<string, string[]>[],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: z.object({
              handle: z.string().openapi({ description: 'Organisation subdomain handle.' }),
              tierId: z.string(),
              sourceId: z.string().openapi({ description: 'Square payment source nonce.' }),
              email: z.string().email(),
              firstName: z.string(),
              lastName: z.string(),
            }),
          },
        },
      },
      responses: mergeResponses(
        ok200(
          z.object({ paymentId: z.string(), membershipId: z.string(), receiptUrl: z.string().optional() })
            .openapi({ ref: 'MembershipCheckoutResult' }),
          'Membership purchased',
        ),
        errorResponses(400, 404),
      ),
    },
  },

  '/api/public/checkout/donation': {
    post: {
      operationId: 'createDonation',
      tags: ['Public Checkout'],
      summary: 'One-off public donation',
      description:
        'Unauthenticated endpoint. The receiving organisation is resolved from the subdomain handle. ' +
        'Charges the donor via Square and records the payment.',
      security: security.public as unknown as Record<string, string[]>[],
      requestBody: {
        description: 'Donation details',
        content: { 'application/json': { schema: DonationBody } },
        required: true,
      },
      responses: mergeResponses(
        ok200(DonationResult, 'Donation processed'),
        errorResponses(400, 404),
      ),
    },
  },
};
