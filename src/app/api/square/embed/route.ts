import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getOrganisationInfo } from '@/lib/org-directory';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { route } from '@/lib/openapi/route';
import { tenantBaseUrlFromSlug } from '@/lib/tenant-url';
import { squareEmbedContract } from '../openapi';

export const GET = route(squareEmbedContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'settings:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const org = await getOrganisationInfo(orgId);
  const orgUrl = org?.slug ?? undefined;
  if (!orgUrl || !/^[a-zA-Z0-9-]+$/.test(orgUrl)) {
    return NextResponse.json({ error: 'Your organisation has no public web address configured yet.' }, { status: 400 });
  }

  try {
    await prisma.organisationSettings.upsert({
      where: { clerkOrganisationId: orgId },
      create: { clerkOrganisationId: orgId, orgUrl },
      update: { orgUrl },
    });
  } catch {
    return NextResponse.json({ error: 'That web address is already in use.' }, { status: 409 });
  }

  const baseUrl = tenantBaseUrlFromSlug(orgUrl);
  return {
    data: {
      handle: orgUrl,
      baseUrl,
      donateUrl: `${baseUrl}/donate`,
      joinUrl: `${baseUrl}/join`,
    },
  };
});
