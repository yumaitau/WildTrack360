import 'zod-openapi/extend';
import { z } from 'zod';

// --- Member ---

export const MemberEntry = z
  .object({
    id: z.string(),
    clerkOrganizationId: z.string(),
    clerkUserId: z.string().nullable(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    suburb: z.string().nullable(),
    state: z.string().nullable(),
    postcode: z.string().nullable(),
    country: z.string(),
    memberNumber: z.string().nullable(),
    status: z.enum(['ACTIVE', 'LAPSED', 'CANCELLED', 'DECEASED']),
    joinedAt: z.string().datetime(),
    customFieldsJson: z.unknown().openapi({ description: 'Custom form fields as a JSON object.' }),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'MemberEntry' });

export const CreateMemberBody = z
  .object({
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    suburb: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    memberNumber: z.string().optional(),
    status: z.enum(['ACTIVE', 'LAPSED', 'CANCELLED', 'DECEASED']).optional(),
    joinedAt: z.string().datetime().optional(),
    customFieldsJson: z.unknown().optional(),
  })
  .openapi({ ref: 'CreateMemberBody' });

export const ImpactStatsResponse = z
  .object({
    totalMembers: z.number().int(),
    activeMembers: z.number().int(),
    lapsedMembers: z.number().int(),
    newThisMonth: z.number().int(),
    retentionRate: z.number().optional(),
  })
  .openapi({ ref: 'ImpactStatsResponse', description: 'Membership impact statistics for the organisation.' });

export const ImportMembersResult = z
  .object({
    imported: z.number().int(),
    skipped: z.number().int(),
    errors: z.array(z.string()).optional(),
  })
  .openapi({ ref: 'ImportMembersResult' });

export const SendMessagesResult = z
  .object({
    created: z.number().int(),
    emailed: z.number().int(),
  })
  .openapi({ ref: 'SendMessagesResult' });

// --- Membership Tier ---

export const MembershipTierEntry = z
  .object({
    id: z.string(),
    clerkOrganizationId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    amountCents: z.number().int().openapi({ description: 'Price in the smallest currency unit (e.g. AUD cents).' }),
    currency: z.string(),
    billingInterval: z.enum(['ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME']),
    gstHandling: z.enum(['NONE', 'INCLUSIVE', 'EXCLUSIVE']),
    benefitsJson: z.array(z.string()).openapi({ description: 'Ordered list of member-facing benefit lines.' }),
    active: z.boolean(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'MembershipTierEntry' });

export const CreateMembershipTierBody = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    amountCents: z.number().int(),
    currency: z.string().optional(),
    billingInterval: z.enum(['ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME']),
    gstHandling: z.enum(['NONE', 'INCLUSIVE', 'EXCLUSIVE']).optional(),
    benefitsJson: z.array(z.string()).optional(),
    active: z.boolean().optional(),
  })
  .openapi({ ref: 'CreateMembershipTierBody' });

export const MembershipGrantResult = z
  .object({
    membership: z.object({
      id: z.string(),
      memberId: z.string(),
      tierId: z.string(),
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
      status: z.string(),
      giftedBy: z.string().nullable(),
    }),
  })
  .openapi({ ref: 'MembershipGrantResult' });

// --- News Post ---

export const NewsPost = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    authorClerkUserId: z.string().nullable(),
    authorName: z.string().nullable(),
    publishedAt: z.string().datetime().nullable(),
    emailSentAt: z.string().datetime().nullable(),
    recipientCount: z.number().int().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'NewsPost' });

export const CreateNewsPostBody = z
  .object({
    title: z.string(),
    body: z.string(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  })
  .openapi({ ref: 'CreateNewsPostBody' });

export const PublishNewsPostBody = z
  .object({
    sendEmail: z.boolean().optional().openapi({ description: 'Also send an email to all active members.' }),
  })
  .openapi({ ref: 'PublishNewsPostBody' });

// --- Permanent Care Application ---

export const PermanentCareApplication = z
  .object({
    id: z.string(),
    animalId: z.string(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
    createdByUserId: z.string(),
    submittedByUserId: z.string().nullable(),
    submittedAt: z.string().datetime().nullable(),
    nonReleasableReasons: z.string(),
    euthanasiaJustification: z.string(),
    vetReportUrl: z.string().nullable(),
    vetName: z.string().nullable(),
    vetClinic: z.string().nullable(),
    vetContact: z.string().nullable(),
    npwsApprovalNumber: z.string().nullable(),
    npwsApprovalDate: z.string().datetime().nullable(),
    keeperName: z.string().nullable(),
    facilityName: z.string().nullable(),
    facilityAddress: z.string().nullable(),
    facilitySuburb: z.string().nullable(),
    facilityState: z.string().nullable(),
    facilityPostcode: z.string().nullable(),
    category: z.enum(['EDUCATION', 'COMPANION', 'RESEARCH']).nullable(),
    reviewedByUserId: z.string().nullable(),
    reviewedAt: z.string().datetime().nullable(),
    rejectionReason: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ ref: 'PermanentCareApplication' });

export const CreatePermanentCareBody = z
  .object({
    animalId: z.string(),
    nonReleasableReasons: z.string(),
    euthanasiaJustification: z.string(),
    vetReportUrl: z.string().optional(),
    vetName: z.string().optional(),
    vetClinic: z.string().optional(),
    vetContact: z.string().optional(),
    keeperName: z.string().optional(),
    facilityName: z.string().optional(),
    facilityAddress: z.string().optional(),
    facilitySuburb: z.string().optional(),
    facilityState: z.string().optional(),
    facilityPostcode: z.string().optional(),
    category: z.enum(['EDUCATION', 'COMPANION', 'RESEARCH']).optional(),
    notes: z.string().optional(),
  })
  .openapi({ ref: 'CreatePermanentCareBody' });
