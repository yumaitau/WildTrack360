'server-only';

import { prisma } from './prisma';
import { isFeatureEnabled } from './features';
import { getConnection } from './square/oauth';

export interface PublicOrg {
  orgId: string;
  orgName: string;
  locationId: string;
  applicationId: string;
}

// Resolve a public subdomain handle (OrganisationSettings.orgUrl, mirrored from
// the Clerk publicMetadata.org_url) to a payable org. Returns null unless the
// org exists, has MEMBERSHIP_PLATFORM enabled, and a live Square connection.
// Used by the unauthenticated /donate and /join pages + /api/public routes so a
// caller can never target an arbitrary org by id.
export async function resolvePublicOrg(handle: string): Promise<PublicOrg | null> {
  if (!handle || !/^[a-z0-9-]+$/i.test(handle)) return null;

  const settings = await prisma.organisationSettings.findFirst({
    where: { orgUrl: { equals: handle, mode: 'insensitive' } },
  });
  if (!settings) return null;

  const orgId = settings.clerkOrganisationId;
  if (!(await isFeatureEnabled(orgId, 'MEMBERSHIP_PLATFORM'))) return null;

  const conn = await getConnection(orgId);
  if (!conn || conn.revokedAt) return null;

  const applicationId =
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? process.env.SQUARE_APPLICATION_ID ?? null;
  if (!applicationId) return null;

  return {
    orgId,
    orgName:
      settings.legalName?.trim() ||
      process.env.NEXT_PUBLIC_ORGANIZATION_NAME ||
      'Wildlife Organisation',
    locationId: conn.locationId,
    applicationId,
  };
}
