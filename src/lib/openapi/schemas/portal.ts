import 'zod-openapi/extend';
import { z } from 'zod';

// --- Portal member profile (subset of Member returned by serialize()) ---

export const PortalMember = z
  .object({
    id: z.string(),
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
    clerkOrganizationId: z.string(),
    customFieldsJson: z.unknown(),
  })
  .openapi({ ref: 'PortalMember' });

// --- Membership tier (portal read-only view) ---

export const PortalTier = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    amountCents: z.number().int().openapi({ description: 'Price in AUD cents.' }),
    currency: z.string(),
    billingInterval: z.enum(['ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME']),
    benefitsJson: z.array(z.string()),
    active: z.boolean(),
  })
  .openapi({ ref: 'PortalTier' });

// --- Subscription ---

export const PortalSubscription = z
  .object({
    id: z.string(),
    status: z.string().openapi({ description: 'e.g. ACTIVE, PENDING, PAST_DUE, CANCELLED.' }),
    amountCents: z.number().int(),
    currency: z.string(),
    interval: z.string(),
    periodEnd: z.string().datetime().nullable(),
    squareSubscriptionId: z.string().nullable(),
  })
  .openapi({ ref: 'PortalSubscription' });

// --- Checkout results ---

export const CheckoutResult = z
  .object({
    paymentId: z.string().optional(),
    membershipId: z.string().optional(),
    receiptUrl: z.string().optional(),
  })
  .openapi({ ref: 'CheckoutResult', description: 'Result of a checkout operation.' });

export const DonationCheckoutBody = z
  .object({
    amountCents: z.number().int().openapi({ description: 'Donation amount in AUD cents.' }),
    sourceId: z.string().openapi({ description: 'Square payment source (card nonce or token).' }),
    message: z.string().optional(),
  })
  .openapi({ ref: 'DonationCheckoutBody' });

export const MembershipCheckoutBody = z
  .object({
    tierId: z.string(),
    sourceId: z.string().openapi({ description: 'Square payment source.' }),
  })
  .openapi({ ref: 'MembershipCheckoutBody' });

export const RecurringDonationCheckoutBody = z
  .object({
    amountCents: z.number().int(),
    interval: z.enum(['MONTHLY', 'ANNUAL']),
    sourceId: z.string(),
  })
  .openapi({ ref: 'RecurringDonationCheckoutBody' });

// --- Household ---

export const HouseholdMemberEntry = z
  .object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    status: z.string(),
  })
  .openapi({ ref: 'HouseholdMemberEntry' });

// --- Messages ---

export const PortalMessageEntry = z
  .object({
    id: z.string(),
    subject: z.string(),
    body: z.string(),
    sentByName: z.string().nullable(),
    emailSentAt: z.string().datetime().nullable(),
    readAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi({ ref: 'PortalMessageEntry' });

// --- News (portal read-only) ---

export const PortalNewsPost = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    authorName: z.string().nullable(),
    publishedAt: z.string().datetime().nullable(),
  })
  .openapi({ ref: 'PortalNewsPost' });

// --- Square config ---

export const PortalSquareConfig = z
  .object({
    applicationId: z.string(),
    locationId: z.string(),
  })
  .openapi({ ref: 'PortalSquareConfig', description: 'Square embed credentials for the member portal checkout.' });

// --- Carer interest (portal submission) ---

export const PortalCarerInterestBody = z
  .object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    experience: z.string().optional(),
    availability: z.string().optional(),
    message: z.string().optional(),
  })
  .openapi({ ref: 'PortalCarerInterestBody' });
