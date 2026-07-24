'server-only';

import { prisma } from './prisma';

export interface OrgDisplayInfo {
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

// Resolve a member-facing display name + contact details for an org. Prefers the
// registered legal name from OrganisationSettings, falls back to the Clerk
// organisation name, then the deployment-wide default. Used to brand the emails
// and portal content members receive.
export async function getOrgDisplayInfo(orgId: string): Promise<OrgDisplayInfo> {
  const settings = await prisma.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
    select: { legalName: true, contactEmail: true, contactPhone: true },
  });

  let name = settings?.legalName?.trim() ?? '';
  if (!name) {
    const { getOrganisationInfo } = await import('@/lib/org-directory');
    const org = await getOrganisationInfo(orgId);
    name = org?.name ?? '';
  }

  return {
    name: name || process.env.NEXT_PUBLIC_ORGANIZATION_NAME || 'Wildlife Organisation',
    contactEmail: settings?.contactEmail ?? null,
    contactPhone: settings?.contactPhone ?? null,
  };
}

export interface ImpactStats {
  animalsHelped: number;
  animalsReleased: number;
}

// Org-wide care impact, surfaced to members ("animals your support helped") and
// available as merge tokens in admin messages. animalsHelped counts every
// animal the org has taken into care; animalsReleased counts successful
// releases.
export async function getImpactStats(orgId: string): Promise<ImpactStats> {
  const [animalsHelped, animalsReleased] = await Promise.all([
    prisma.animal.count({ where: { clerkOrganizationId: orgId } }),
    prisma.animal.count({ where: { clerkOrganizationId: orgId, status: 'RELEASED' } }),
  ]);
  return { animalsHelped, animalsReleased };
}
