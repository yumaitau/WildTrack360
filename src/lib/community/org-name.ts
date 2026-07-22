import 'server-only';

import { clerkClient } from '@/lib/clerk-server';

// Resolve a Clerk organisation's display name for the optional Community
// organisation badge. This is display-only metadata denormalised onto
// CommunityProfile so DTOs never join to operational organisation records.
export async function resolveOrganisationName(clerkOrganizationId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: clerkOrganizationId });
    return org.name ?? null;
  } catch {
    return null;
  }
}
