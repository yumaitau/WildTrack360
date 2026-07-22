import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { orgSource } from '@/lib/org-source';
import { prisma } from '@/lib/prisma';
import {
  deactivateUser,
  upsertOrganisationFromClerk,
  upsertUserFromClerk,
} from '@/lib/user-sync';

// Clerk → DB sync webhook (issue #56 Phase 1). Svix signature verification is
// handled by verifyWebhook using CLERK_WEBHOOK_SIGNING_SECRET; the route is
// public in middleware because Clerk calls it without a session.
//
// User events keep the users mirror fresh in both modes (and claim `pending_`
// invite placeholders by verified email). Organisation / membership events
// only apply while Clerk is still authoritative (ORG_SOURCE=clerk): once the
// DB owns membership, a Clerk-side change must not overwrite it.

type ClerkEmailAddress = {
  id: string;
  email_address: string;
  verification?: { status?: string | null } | null;
};

type ClerkUserPayload = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
};

function verifiedPrimaryEmail(user: ClerkUserPayload): string | null {
  const addresses = user.email_addresses ?? [];
  const primary =
    addresses.find((e) => e.id === user.primary_email_address_id) ?? addresses[0];
  if (!primary) return null;
  // Only a verified address may claim a pending invite placeholder.
  return primary.verification?.status === 'verified' ? primary.email_address : null;
}

async function handleUserUpsert(user: ClerkUserPayload): Promise<void> {
  await upsertUserFromClerk({
    id: user.id,
    email: verifiedPrimaryEmail(user),
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    imageUrl: user.image_url ?? null,
  });
}

type ClerkOrganisationPayload = {
  id: string;
  name?: string | null;
  image_url?: string | null;
  public_metadata?: Record<string, unknown> | null;
};

async function handleOrganisationUpsert(org: ClerkOrganisationPayload): Promise<void> {
  const meta = org.public_metadata ?? {};
  await upsertOrganisationFromClerk({
    id: org.id,
    name: org.name,
    slug: typeof meta.org_url === 'string' ? meta.org_url : null,
    jurisdiction: typeof meta.jurisdiction === 'string' ? meta.jurisdiction : null,
    logoUrl: org.image_url ?? null,
  });
}

type ClerkMembershipPayload = {
  role?: string | null;
  organization?: ClerkOrganisationPayload | null;
  public_user_data?: {
    user_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  } | null;
};

async function handleMembershipCreated(membership: ClerkMembershipPayload): Promise<void> {
  const userId = membership.public_user_data?.user_id;
  const org = membership.organization;
  if (!userId || !org?.id) return;

  // Satisfy the OrgMember FKs even if the org/user events were missed.
  await handleOrganisationUpsert(org);
  await upsertUserFromClerk({
    id: userId,
    firstName: membership.public_user_data?.first_name ?? null,
    lastName: membership.public_user_data?.last_name ?? null,
    imageUrl: membership.public_user_data?.image_url ?? null,
  });

  // Same mapping as the backfill script: preserve an existing DB role; only a
  // brand-new membership gets the Clerk-derived default.
  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId, orgId: org.id } },
    create: {
      userId,
      orgId: org.id,
      role: membership.role === 'org:admin' ? 'ADMIN' : 'CARER',
    },
    update: {},
  });
}

async function handleMembershipDeleted(membership: ClerkMembershipPayload): Promise<void> {
  const userId = membership.public_user_data?.user_id;
  const orgId = membership.organization?.id;
  if (!userId || !orgId) return;
  await prisma.orgMember.deleteMany({ where: { userId, orgId } });
}

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error('Clerk webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await handleUserUpsert(event.data as unknown as ClerkUserPayload);
        break;
      case 'user.deleted': {
        const userId = (event.data as { id?: string }).id;
        if (userId) await deactivateUser(userId);
        break;
      }
      case 'organization.created':
      case 'organization.updated':
        if (orgSource() === 'clerk') {
          await handleOrganisationUpsert(event.data as unknown as ClerkOrganisationPayload);
        }
        break;
      case 'organizationMembership.created':
        if (orgSource() === 'clerk') {
          await handleMembershipCreated(event.data as unknown as ClerkMembershipPayload);
        }
        break;
      case 'organizationMembership.deleted':
        if (orgSource() === 'clerk') {
          await handleMembershipDeleted(event.data as unknown as ClerkMembershipPayload);
        }
        break;
      default:
        // Unhandled event types are acknowledged so Clerk doesn't retry them.
        break;
    }
  } catch (error) {
    console.error(`Clerk webhook handler failed for ${event.type}:`, error);
    // 500 → svix retries with backoff, which is what we want for DB hiccups.
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
