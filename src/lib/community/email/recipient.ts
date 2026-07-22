import 'server-only';

import { clerkClient } from '@/lib/clerk-server';

// RangerOS joined CommunityProfile → User to resolve the recipient email.
// WildTrack360 has no local user table, so we resolve the deliverable address
// from Clerk at send time. This keeps email out of the Community database and
// out of every DTO — it exists only transiently in the send path.
export async function resolveRecipientEmail(
  clerkUserId: string
): Promise<{ email: string | null; isActive: boolean }> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const primary =
      user.emailAddresses.find((e: { id: string }) => e.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    // Treat a banned/locked Clerk user as inactive so we never mail them.
    const isActive = !user.banned && !user.locked;
    return { email: primary?.emailAddress ?? null, isActive };
  } catch {
    return { email: null, isActive: false };
  }
}
