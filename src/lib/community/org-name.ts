import 'server-only';

import { getOrganisationInfo } from '@/lib/org-directory';

// Resolve an organisation's display name for the optional Community
// organisation badge (DB or Clerk depending on ORG_SOURCE). This is
// display-only metadata denormalised onto CommunityProfile so DTOs never
// join to operational organisation records.
export async function resolveOrganisationName(clerkOrganizationId: string): Promise<string | null> {
  try {
    const org = await getOrganisationInfo(clerkOrganizationId);
    return org?.name ?? null;
  } catch {
    return null;
  }
}
