import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, csv200 } from '../responses';

const OrgSettings = z
  .object({
    clerkOrganisationId: z.string(),
    orgShortCode: z.string(),
    animalIdTemplate: z.string(),
    orgUrl: z.string().nullable().optional(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    licenseNumber: z.string().nullable(),
    abn: z.string().nullable().optional(),
    dgrEndorsed: z.boolean().optional(),
    receiptPrefix: z.string().nullable().optional(),
    donationThankYouMessage: z.string().nullable().optional(),
    membershipThankYouMessage: z.string().nullable().optional(),
  })
  .openapi({ ref: 'OrgSettings' });

const OnboardingStatus = z
  .object({
    squareConnected: z.boolean(),
    hasTiers: z.boolean(),
    hasAbn: z.boolean(),
    hasOrgUrl: z.boolean(),
    hasMember: z.boolean(),
    hasPublishedNews: z.boolean(),
  })
  .openapi({ ref: 'OnboardingStatus', description: 'Booleans driving the membership platform setup checklist.' });

const FeedRosterItem = z
  .object({
    id: z.string().openapi({ description: 'Animal ID.' }),
    name: z.string(),
    species: z.string(),
    age: z.string().nullable(),
    ageClass: z.string().nullable(),
    status: z.string().openapi({ description: 'Animal lifecycle status (IN_CARE or READY_FOR_RELEASE).' }),
    carerId: z.string().nullable(),
    carerName: z.string().openapi({ description: 'Resolved carer name, or "Unassigned".' }),
    lastFeedingAt: z.string().datetime().nullable(),
    lastFeedingNotes: z.string().nullable(),
    nextDueAt: z.string().datetime().openapi({ description: 'When the next feed is due.' }),
    recommendedIntervalHours: z.number().int(),
    hoursSinceLastFeed: z.number().nullable(),
    hoursOverdue: z.number().openapi({ description: 'Hours past due (negative when not yet due).' }),
    isOverdue: z.boolean(),
  })
  .openapi({ ref: 'FeedRosterItem', description: 'A single animal feeding-due item.' });

const userIdParam = z.string().openapi({ param: { name: 'userId', in: 'path' }, description: 'Clerk user ID.' });

export const adminPaths: ZodOpenApiPathsObject = {

  '/api/admin/org-settings': {
    get: {
      tags: ['Admin'],
      summary: 'Get organisation settings',
      operationId: 'getOrgSettings',
      responses: {
        ...ok200(OrgSettings),
        ...errorResponses(401, 403),
      },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update organisation settings',
      operationId: 'updateOrgSettings',
      requestBody: {
        content: { 'application/json': { schema: OrgSettings.partial() } },
      },
      responses: {
        ...ok200(OrgSettings),
        ...errorResponses(400, 401, 403),
      },
    },
  },

  '/api/admin/invite': {
    post: {
      tags: ['Admin'],
      summary: 'Send a Clerk organisation invitation',
      operationId: 'adminInviteUser',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              email: z.string().email(),
              role: z.string().optional().openapi({ description: 'Clerk org role to assign.' }),
            }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ id: z.string() })),
        ...errorResponses(400, 401, 403, 502),
      },
    },
  },

  '/api/admin/onboarding': {
    get: {
      tags: ['Admin'],
      summary: 'Get membership platform onboarding checklist status',
      operationId: 'getAdminOnboarding',
      responses: {
        ...ok200(OnboardingStatus),
        ...errorResponses(401, 403, 404),
      },
    },
  },

  '/api/admin/eofy': {
    get: {
      tags: ['Admin'],
      summary: 'Get end-of-financial-year donor and payment summary',
      operationId: 'getEofy',
      requestParams: {
        query: z.object({
          fyEndYear: z.string().optional().openapi({ description: 'Financial year end (e.g. 2025 = FY2024-25).' }),
        }),
      },
      responses: {
        ...ok200(z.object({ fyEndYear: z.number().int(), donors: z.array(z.unknown()) })),
        ...errorResponses(400, 401, 403, 404),
      },
    },
  },

  '/api/admin/export': {
    get: {
      tags: ['Admin'],
      summary: 'Export the member and payment register as CSV',
      operationId: 'adminExport',
      requestParams: {
        query: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      },
      responses: {
        ...csv200('Member and payment export CSV'),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/admin/export/nsw-registers': {
    get: {
      tags: ['Admin'],
      summary: 'Export NSW wildlife registers as CSV',
      operationId: 'adminExportNswRegisters',
      requestParams: {
        query: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      },
      responses: {
        ...csv200('NSW wildlife registers export CSV'),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },

  '/api/admin/users/{userId}': {
    delete: {
      tags: ['Admin'],
      summary: "Remove a user from the organisation (revokes their Clerk org membership)",
      operationId: 'adminDeleteUser',
      requestParams: { path: z.object({ userId: userIdParam }) },
      responses: {
        ...ok200(z.object({ success: z.boolean() })),
        ...errorResponses(400, 401, 403),
      },
    },
  },

  '/api/admin-notification-dismissals': {
    post: {
      tags: ['Admin'],
      summary: 'Dismiss an admin notification reminder',
      operationId: 'dismissAdminNotification',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              kind: z.string(),
              reminderKey: z.string(),
              year: z.number().int(),
            }),
          },
        },
      },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(400, 401),
      },
    },
  },

  '/api/feed-roster': {
    get: {
      tags: ['Admin'],
      summary: 'Get the feeding roster (animals due to be fed, scoped to the caller\'s role)',
      operationId: 'getFeedRoster',
      requestParams: {
        query: z.object({
          orgId: z.string().optional().openapi({ description: 'Organisation ID (resolved from session if omitted).' }),
        }),
      },
      responses: {
        ...ok200(z.array(FeedRosterItem)),
        ...errorResponses(400, 401, 403, 500),
      },
    },
  },
};
