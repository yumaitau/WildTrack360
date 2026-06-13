'server-only';

import { prisma } from './prisma';
import { clerkClient } from '@/lib/clerk-server';
import type { Member } from '@prisma/client';

export interface PortalSession {
  member: Member;
  email: string;
}

// Resolves the signed-in Clerk user to a Member row. First tries the direct
// link via Member.clerkUserId. If that's null but a Member with the same email
// exists in some org and hasn't been claimed yet, atomically claim it. This is
// how a brand-new portal sign-in (admin created the Member, then the member
// signed up with that email) gets bound to the right Member record.
export async function getPortalMember(clerkUserId: string): Promise<PortalSession | null> {
  const claimed = await prisma.member.findFirst({
    where: { clerkUserId, archivedAt: null },
  });
  if (claimed) {
    const email = await fetchClerkEmail(clerkUserId);
    return { member: claimed, email: email ?? claimed.email };
  }

  const email = await fetchClerkEmail(clerkUserId);
  if (!email) return null;

  const candidate = await prisma.member.findFirst({
    where: {
      clerkUserId: null,
      archivedAt: null,
      email: { equals: email, mode: 'insensitive' },
    },
  });
  if (!candidate) return null;

  // Conditional update guarded by `clerkUserId: null` so two concurrent
  // claims for the same email don't both succeed. The second loses the race
  // (count=0) and falls back to re-fetching whoever holds the row now —
  // which is the correct mapping anyway because the first claim won.
  const claimResult = await prisma.member.updateMany({
    where: { id: candidate.id, clerkUserId: null },
    data: { clerkUserId },
  });
  if (claimResult.count === 0) {
    const winner = await prisma.member.findFirst({
      where: { id: candidate.id },
    });
    if (!winner || winner.clerkUserId !== clerkUserId) return null;
    return { member: winner, email };
  }
  const updated = await prisma.member.findUniqueOrThrow({ where: { id: candidate.id } });
  return { member: updated, email };
}

async function fetchClerkEmail(clerkUserId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    return user.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

const PORTAL_EDITABLE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'addressLine1',
  'addressLine2',
  'suburb',
  'state',
  'postcode',
  'country',
] as const;

export type PortalEditableField = (typeof PORTAL_EDITABLE_FIELDS)[number];

// Members can edit a narrow subset of their own profile — name, contact, and
// address. Email, status, member number, and custom fields the org configured
// stay in admin hands (custom fields editable in a follow-up phase if needed).
export function pickPortalEditable(body: Record<string, unknown>) {
  const out: Partial<Record<PortalEditableField, string | null>> = {};
  for (const key of PORTAL_EDITABLE_FIELDS) {
    if (body[key] !== undefined) {
      const value = body[key];
      out[key] = value === null ? null : String(value);
    }
  }
  return out;
}
