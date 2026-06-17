import { z } from 'zod';
import type { ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponses, ok200, created201 } from '../responses';
import {
  MemberEntry,
  CreateMemberBody,
  ImpactStatsResponse,
  ImportMembersResult,
  SendMessagesResult,
  MembershipTierEntry,
  CreateMembershipTierBody,
  MembershipGrantResult,
  NewsPost,
  CreateNewsPostBody,
  PublishNewsPostBody,
  PermanentCareApplication,
  CreatePermanentCareBody,
} from '../schemas/members';

const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, description: 'Resource ID.' });

export const membersPaths: ZodOpenApiPathsObject = {

  // --- Members ---
  '/api/members': {
    get: {
      tags: ['Members'],
      summary: 'List members for the organisation',
      operationId: 'listMembers',
      requestParams: {
        query: z.object({
          status: z.string().optional().openapi({ description: 'Filter by MemberStatus.' }),
          search: z.string().optional().openapi({ description: 'Search by name or email.' }),
        }),
      },
      responses: {
        ...ok200(z.array(MemberEntry)),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    post: {
      tags: ['Members'],
      summary: 'Create a member',
      operationId: 'createMember',
      requestBody: {
        content: { 'application/json': { schema: CreateMemberBody } },
      },
      responses: {
        ...created201(MemberEntry),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/members/{id}': {
    get: {
      tags: ['Members'],
      summary: 'Get a member',
      operationId: 'getMember',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(MemberEntry),
        ...errorResponses(401, 403, 404),
      },
    },
    patch: {
      tags: ['Members'],
      summary: 'Update a member',
      operationId: 'updateMember',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateMemberBody.partial() } },
      },
      responses: {
        ...ok200(MemberEntry),
        ...errorResponses(400, 401, 403, 404),
      },
    },
    delete: {
      tags: ['Members'],
      summary: 'Delete (archive) a member',
      operationId: 'deleteMember',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  '/api/members/{id}/invite': {
    post: {
      tags: ['Members'],
      summary: 'Send a portal invitation to a member',
      operationId: 'inviteMember',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(400, 401, 403, 404),
      },
    },
  },

  '/api/members/export': {
    get: {
      tags: ['Members'],
      summary: 'Export member list as CSV',
      operationId: 'exportMembers',
      responses: {
        '200': {
          description: 'CSV file download.',
          content: { 'text/csv': { schema: z.string() } },
        },
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  '/api/members/impact-stats': {
    get: {
      tags: ['Members'],
      summary: 'Get membership impact statistics',
      operationId: 'getMemberImpactStats',
      responses: {
        ...ok200(ImpactStatsResponse),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  '/api/members/import': {
    post: {
      tags: ['Members'],
      summary: 'Bulk-import members from a CSV file (multipart/form-data)',
      operationId: 'importMembers',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              file: z.unknown().openapi({ description: 'CSV file with member data.' }),
            }),
          },
        },
      },
      responses: {
        ...ok200(ImportMembersResult),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/members/import/sample': {
    get: {
      tags: ['Members'],
      summary: 'Download a sample CSV import template',
      operationId: 'getMemberImportSample',
      responses: {
        '200': {
          description: 'Sample CSV template.',
          content: { 'text/csv': { schema: z.string() } },
        },
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  '/api/members/messages': {
    post: {
      tags: ['Members'],
      summary: 'Send a direct message to one or more members',
      operationId: 'sendMemberMessages',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              memberIds: z.array(z.string()).openapi({ description: 'Target member IDs. Omit to send to all active members.' }).optional(),
              subject: z.string(),
              body: z.string(),
              sendEmail: z.boolean().optional(),
            }),
          },
        },
      },
      responses: {
        ...ok200(SendMessagesResult),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  // --- Membership Tiers ---
  '/api/membership-tiers': {
    get: {
      tags: ['Membership Tiers & Grants'],
      summary: 'List membership tiers',
      operationId: 'listMembershipTiers',
      responses: {
        ...ok200(z.array(MembershipTierEntry)),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    post: {
      tags: ['Membership Tiers & Grants'],
      summary: 'Create a membership tier',
      operationId: 'createMembershipTier',
      requestBody: {
        content: { 'application/json': { schema: CreateMembershipTierBody } },
      },
      responses: {
        ...created201(MembershipTierEntry),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/membership-tiers/{id}': {
    patch: {
      tags: ['Membership Tiers & Grants'],
      summary: 'Update a membership tier',
      operationId: 'updateMembershipTier',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateMembershipTierBody.partial() } },
      },
      responses: {
        ...ok200(MembershipTierEntry),
        ...errorResponses(401, 403, 500),
      },
    },
    delete: {
      tags: ['Membership Tiers & Grants'],
      summary: 'Archive a membership tier',
      operationId: 'deleteMembershipTier',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },

  // --- Membership Grants ---
  '/api/membership-grants': {
    post: {
      tags: ['Membership Tiers & Grants'],
      summary: 'Grant a complimentary membership to a member',
      operationId: 'grantMembership',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              memberId: z.string(),
              tierId: z.string(),
              giftedBy: z.string().optional().openapi({ description: 'Name shown on the membership card. Defaults to "Complimentary".' }),
            }),
          },
        },
      },
      responses: {
        ...ok200(MembershipGrantResult),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  // --- News Posts ---
  '/api/news': {
    get: {
      tags: ['Members'],
      summary: 'List news posts for the organisation',
      operationId: 'listNewsPosts',
      responses: {
        ...ok200(z.array(NewsPost)),
        ...errorResponses(401, 403, 404, 500),
      },
    },
    post: {
      tags: ['Members'],
      summary: 'Create a news post',
      operationId: 'createNewsPost',
      requestBody: {
        content: { 'application/json': { schema: CreateNewsPostBody } },
      },
      responses: {
        ...created201(NewsPost),
        ...errorResponses(400, 401, 403, 404, 500),
      },
    },
  },

  '/api/news/{id}': {
    get: {
      tags: ['Members'],
      summary: 'Get a news post',
      operationId: 'getNewsPost',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(NewsPost),
        ...errorResponses(401, 403, 404),
      },
    },
    patch: {
      tags: ['Members'],
      summary: 'Update a news post',
      operationId: 'updateNewsPost',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreateNewsPostBody.partial() } },
      },
      responses: {
        ...ok200(NewsPost),
        ...errorResponses(401, 403, 500),
      },
    },
    delete: {
      tags: ['Members'],
      summary: 'Delete a news post',
      operationId: 'deleteNewsPost',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(z.object({ ok: z.boolean() })),
        ...errorResponses(401, 403, 500),
      },
    },
  },

  '/api/news/{id}/publish': {
    post: {
      tags: ['Members'],
      summary: 'Publish a news post (optionally emailing all active members)',
      operationId: 'publishNewsPost',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: PublishNewsPostBody } },
      },
      responses: {
        ...ok200(NewsPost),
        ...errorResponses(401, 403, 500),
      },
    },
  },

  // --- Permanent Care Applications ---
  '/api/permanent-care-applications': {
    get: {
      tags: ['Permanent Care'],
      summary: 'List permanent care applications',
      operationId: 'listPermanentCareApplications',
      requestParams: {
        query: z.object({
          animalId: z.string().optional(),
        }),
      },
      responses: {
        ...ok200(z.array(PermanentCareApplication)),
        ...errorResponses(401, 500),
      },
    },
    post: {
      tags: ['Permanent Care'],
      summary: 'Create a permanent care application',
      operationId: 'createPermanentCareApplication',
      requestBody: {
        content: { 'application/json': { schema: CreatePermanentCareBody } },
      },
      responses: {
        ...created201(PermanentCareApplication),
        ...errorResponses(400, 401, 403, 404, 422, 500),
      },
    },
  },

  '/api/permanent-care-applications/{id}': {
    get: {
      tags: ['Permanent Care'],
      summary: 'Get a permanent care application',
      operationId: 'getPermanentCareApplication',
      requestParams: { path: z.object({ id: idParam }) },
      responses: {
        ...ok200(PermanentCareApplication),
        ...errorResponses(401, 404, 500),
      },
    },
    patch: {
      tags: ['Permanent Care'],
      summary: 'Update a permanent care application (including status transitions)',
      operationId: 'updatePermanentCareApplication',
      requestParams: { path: z.object({ id: idParam }) },
      requestBody: {
        content: { 'application/json': { schema: CreatePermanentCareBody.partial() } },
      },
      responses: {
        ...ok200(PermanentCareApplication),
        ...errorResponses(401, 403, 404, 500),
      },
    },
  },
};
