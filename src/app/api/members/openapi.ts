import { z } from '@/lib/openapi/registry';
import { defineContract } from '@/lib/openapi/contract';

// Prisma serialises Date -> ISO string on the wire; validate leniently as string.
const isoDate = () => z.string().openapi({ format: 'date-time' });

export const MemberStatusEnum = z
  .enum(['ACTIVE', 'LAPSED', 'CANCELLED', 'DECEASED'])
  .openapi('MemberStatus');

/** Serialised Prisma Member (all 26 scalar fields). Mirrors prisma/schema.prisma model Member. */
export const MemberSchema = z
  .object({
    // Non-null (11)
    id: z.string(),
    clerkOrganizationId: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    country: z.string(),
    status: MemberStatusEnum,
    joinedAt: isoDate(),
    createdAt: isoDate(),
    updatedAt: isoDate(),
    customFieldsJson: z.unknown(),
    // Nullable (15)
    clerkUserId: z.string().nullable(),
    clerkInvitationId: z.string().nullable(),
    carerProfileId: z.string().nullable(),
    squareCustomerId: z.string().nullable(),
    squareCardId: z.string().nullable(),
    phone: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    memberNumber: z.string().nullable(),
    primaryMemberId: z.string().nullable(),
    portalInvitedAt: isoDate().nullable(),
    archivedAt: isoDate().nullable(),
  })
  .openapi('Member');

// SHORTCUT: membership + tier modelled with stable key fields only; tighten when
// the memberships/tiers domain is migrated.
const MembershipTierLiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  billingInterval: z.string(),
  active: z.boolean(),
});

const MembershipWithTierLiteSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  tierId: z.string(),
  periodStart: isoDate(),
  periodEnd: isoDate(),
  status: z.string(),
  createdAt: isoDate(),
  tier: MembershipTierLiteSchema,
});

export const MemberWithMembershipsSchema = MemberSchema.extend({
  memberships: z.array(MembershipWithTierLiteSchema),
}).openapi('MemberWithMemberships');

export const MemberCreateSchema = z
  .object({
    email: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().nullable().optional(),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    suburb: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    memberNumber: z.string().nullable().optional(),
    status: MemberStatusEnum.optional(),
    joinedAt: z.union([z.string(), z.null()]).optional(),
    customFields: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough()
  .openapi('MemberCreate');

export const MemberUpdateSchema = z
  .object({
    email: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    suburb: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postcode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    memberNumber: z.string().nullable().optional(),
    status: MemberStatusEnum.optional(),
    joinedAt: z.union([z.string(), z.null()]).optional(),
    customFields: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough()
  .openapi('MemberUpdate');

const MemberListQuerySchema = z.object({
  search: z.string().optional(),
  status: MemberStatusEnum.optional(),
  includeArchived: z.string().optional(),
  limit: z.string().optional(),
});

export const OkSchema = z.object({ ok: z.boolean() }).openapi('OkResult');

export const listMembersContract = defineContract({
  method: 'get',
  path: '/api/members',
  summary: 'List members for the organisation',
  tags: ['Members'],
  security: 'clerkSession',
  request: { query: MemberListQuerySchema },
  responses: {
    200: { description: 'Member list', schema: z.array(MemberSchema) },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 200,
});

export const createMemberContract = defineContract({
  method: 'post',
  path: '/api/members',
  summary: 'Create a member',
  tags: ['Members'],
  security: 'clerkSession',
  request: { body: MemberCreateSchema },
  responses: {
    201: { description: 'The created member', schema: MemberSchema },
    400: { description: 'Invalid request body or validation error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Feature not enabled' },
  },
  successStatus: 201,
});
