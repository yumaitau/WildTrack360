import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { prisma } from '@/lib/prisma';
import { route } from '@/lib/openapi/route';
import { onboardingStatusContract } from '../openapi';

// GET /api/admin/onboarding - booleans driving the "set up memberships"
// checklist on the Members admin page.
export const GET = route(onboardingStatusContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:view_all');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [square, tierCount, settings, memberCount, newsCount] = await Promise.all([
    prisma.squareConnection.findUnique({ where: { clerkOrganizationId: orgId }, select: { revokedAt: true } }),
    prisma.membershipTier.count({ where: { clerkOrganizationId: orgId, active: true, archivedAt: null } }),
    prisma.organisationSettings.findUnique({ where: { clerkOrganisationId: orgId }, select: { abn: true, orgUrl: true } }),
    prisma.member.count({ where: { clerkOrganizationId: orgId, archivedAt: null } }),
    prisma.newsPost.count({ where: { clerkOrganizationId: orgId, status: 'PUBLISHED' } }),
  ]);

  return {
    data: {
      squareConnected: Boolean(square && !square.revokedAt),
      hasTiers: tierCount > 0,
      receiptsConfigured: Boolean(settings?.abn),
      joinPagePublic: Boolean(settings?.orgUrl),
      hasMembers: memberCount > 0,
      hasNewsPost: newsCount > 0,
    },
  };
});
