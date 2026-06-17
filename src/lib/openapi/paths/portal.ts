import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, created201 } from '../responses';
import {
  PortalMember,
  PortalTier,
  PortalSubscription,
  CheckoutResult,
  DonationCheckoutBody,
  MembershipCheckoutBody,
  RecurringDonationCheckoutBody,
  HouseholdMemberEntry,
  PortalMessageEntry,
  PortalNewsPost,
  PortalSquareConfig,
  PortalCarerInterestBody,
} from '../schemas/portal';

const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Resource ID.' });

export const portalPaths: ZodOpenApiPathsObject = {

  // --- Portal self-profile ---
  '/api/portal/me': {
    get: {
      tags: ['Portal'],
      summary: "Get the authenticated member's portal profile",
      operationId: 'getPortalMe',
      responses: {
        ...ok200(PortalMember),
        ...errorResponses(401, 404),
      },
    },
    patch: {
      tags: ['Portal'],
      summary: "Update the authenticated member's portal profile",
      operationId: 'updatePortalMe',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              phone: z.string().optional(),
              addressLine1: z.string().optional(),
              addressLine2: z.string().optional(),
              suburb: z.string().optional(),
              state: z.string().optional(),
              postcode: z.string().optional(),
              country: z.string().optional(),
            }),
          },
        },
      },
      responses: {
        ...ok200(PortalMember),
        ...errorResponses(400, 401, 404),
      },
    },
  },

  // --- Portal membership tiers ---
  '/api/portal/tiers': {
    get: {
      tags: ['Portal'],
      summary: 'List active membership tiers available in the member portal',
      operationId: 'getPortalTiers',
      responses: {
        ...ok200(z.array(PortalTier)),
        ...errorResponses(401, 404),
      },
    },
  },

  // --- Portal checkout ---
  '/api/portal/checkout/donation': {
    post: {
      tags: ['Portal'],
      summary: 'Make a one-off donation via the member portal',
      operationId: 'portalCheckoutDonation',
      requestBody: {
        content: { 'application/json': { schema: DonationCheckoutBody } },
      },
      responses: {
        ...ok200(CheckoutResult),
        ...errorResponses(400, 401, 404),
      },
    },
  },

  '/api/portal/checkout/membership': {
    post: {
      tags: ['Portal'],
      summary: 'Purchase a membership tier via the member portal',
      operationId: 'portalCheckoutMembership',
      requestBody: {
        content: { 'application/json': { schema: MembershipCheckoutBody } },
      },
      responses: {
        ...ok200(CheckoutResult),
        ...errorResponses(400, 401, 404),
      },
    },
  },

  '/api/portal/checkout/recurring-donation': {
    post: {
      tags: ['Portal'],
      summary: 'Set up a recurring donation via the member portal',
      operationId: 'portalCheckoutRecurringDonation',
      requestBody: {
        content: { 'application/json': { schema: RecurringDonationCheckoutBody } },
      },
      responses: {
        ...ok200(CheckoutResult),
        ...errorResponses(400, 401, 404),
      },
    },
  },

  // --- Portal subscriptions ---
  '/api/portal/subscriptions': {
    get: {
      tags: ['Portal'],
      summary: "List the authenticated member's recurring subscriptions",
      operationId: 'getPortalSubscriptions',
      responses: {
        ...ok200(z.array(PortalSubscription)),
        ...errorResponses(401, 404),
      },
    },
  },

  '/api/portal/subscriptions/{id}/cancel': {
    post: {
      tags: ['Portal'],
      summary: 'Cancel a recurring subscription',
      operationId: 'cancelPortalSubscription',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 404),
      },
    },
  },

  '/api/portal/subscriptions/{id}/card': {
    post: {
      tags: ['Portal'],
      summary: 'Update the payment card on a recurring subscription',
      operationId: 'updatePortalSubscriptionCard',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              sourceId: z.string().openapi({ description: 'New Square card nonce.' }),
            }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(400, 401, 404),
      },
    },
  },

  // --- Portal household ---
  '/api/portal/household': {
    get: {
      tags: ['Portal'],
      summary: "List the household members linked to the authenticated member's account",
      operationId: 'getPortalHousehold',
      responses: {
        ...ok200(z.object({ members: z.array(HouseholdMemberEntry) })),
        ...errorResponses(401, 403, 404),
      },
    },
    post: {
      tags: ['Portal'],
      summary: 'Add a household member',
      operationId: 'addPortalHouseholdMember',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              email: z.string().email(),
              firstName: z.string(),
              lastName: z.string(),
            }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ id: z.string() })),
        ...errorResponses(400, 401, 403, 404),
      },
    },
    delete: {
      tags: ['Portal'],
      summary: 'Remove a household member',
      operationId: 'removePortalHouseholdMember',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({ id: z.string() }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(400, 401, 403, 404),
      },
    },
  },

  // --- Portal messages ---
  '/api/portal/messages': {
    get: {
      tags: ['Portal'],
      summary: "List messages in the authenticated member's portal inbox",
      operationId: 'getPortalMessages',
      responses: {
        ...ok200(z.object({ messages: z.array(PortalMessageEntry), unreadCount: z.number().int() })),
        ...errorResponses(401, 404),
      },
    },
  },

  '/api/portal/messages/{id}/read': {
    post: {
      tags: ['Portal'],
      summary: 'Mark a portal message as read',
      operationId: 'markPortalMessageRead',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 404),
      },
    },
  },

  // --- Portal news ---
  '/api/portal/news': {
    get: {
      tags: ['Portal'],
      summary: 'List published news posts visible in the member portal',
      operationId: 'getPortalNews',
      responses: {
        ...ok200(z.array(PortalNewsPost)),
        ...errorResponses(401, 404),
      },
    },
  },

  // --- Portal Square config ---
  '/api/portal/square-config': {
    get: {
      tags: ['Portal'],
      summary: 'Get Square embed credentials for the member portal checkout',
      operationId: 'getPortalSquareConfig',
      responses: {
        ...ok200(PortalSquareConfig),
        ...errorResponses(401, 404, 503),
      },
    },
  },

  // --- Portal carer interest ---
  '/api/portal/carer-interest': {
    get: {
      tags: ['Portal'],
      summary: "Get the authenticated member's carer interest submission (if any)",
      operationId: 'getPortalCarerInterest',
      responses: {
        ...ok200(z.object({ open: z.boolean() })),
        ...errorResponses(401, 404),
      },
    },
    post: {
      tags: ['Portal'],
      summary: 'Submit a carer interest expression from the member portal',
      operationId: 'createPortalCarerInterest',
      requestBody: {
        content: { 'application/json': { schema: PortalCarerInterestBody } },
      },
      responses: {
        ...created201(z.object({ id: z.string() })),
        ...errorResponses(400, 401, 404),
      },
    },
  },
};
