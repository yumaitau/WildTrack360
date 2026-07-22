import { NextResponse } from 'next/server';
import { COMMUNITY_GUIDELINES_VERSION } from '@/lib/community/access';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { communityProfileSchema } from '@/lib/community/validation';
import { resolveOrganisationName } from '@/lib/community/org-name';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requireCommunitySession();
  if ('error' in auth) return auth.error;
  return NextResponse.json({
    access: auth.session.access,
    guidelinesVersion: COMMUNITY_GUIDELINES_VERSION,
    profile: auth.session.profile
      ? {
          id: auth.session.profile.id,
          displayName: auth.session.profile.displayName,
          showOrganisationBadge: auth.session.profile.showOrganisationBadge,
          region: auth.session.profile.region,
          guidelinesVersion: auth.session.profile.guidelinesVersion,
          guidelinesAcceptedAt: auth.session.profile.guidelinesAcceptedAt,
        }
      : null,
  });
}

export async function PUT(request: Request) {
  const auth = await requireCommunitySession({ write: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityProfileSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { userId, homeOrgId } = auth.session;
  // Community identity is anchored to the verified home organisation. Never
  // taken from the request body. During onboarding this is the active Clerk org
  // (already verified by getCommunitySession); afterwards it is the persisted one.
  if (!homeOrgId) {
    return NextResponse.json({ error: 'No home organisation' }, { status: 403 });
  }
  // Denormalise the org display name for the optional badge (display-only; never
  // joins to operational records).
  const homeOrganisationName = await resolveOrganisationName(homeOrgId);

  const profile = await prisma.$transaction(async (tx) => {
    const saved = await tx.communityProfile.upsert({
      where: { clerkUserId: userId },
      create: {
        clerkUserId: userId,
        homeClerkOrganizationId: homeOrgId,
        homeOrganisationName,
        displayName: parsed.data.displayName,
        showOrganisationBadge: parsed.data.showOrganisationBadge,
        region: parsed.data.region ?? null,
        guidelinesVersion: COMMUNITY_GUIDELINES_VERSION,
        guidelinesAcceptedAt: new Date(),
      },
      update: {
        // Refresh the denormalised org name but never rewrite the home org here;
        // changing a home organisation is a separate audited support path.
        homeOrganisationName,
        displayName: parsed.data.displayName,
        showOrganisationBadge: parsed.data.showOrganisationBadge,
        region: parsed.data.region ?? null,
        guidelinesVersion: COMMUNITY_GUIDELINES_VERSION,
        guidelinesAcceptedAt: new Date(),
      },
    });
    await tx.communityNotificationPreference.upsert({
      where: { profileId: saved.id },
      create: {
        profileId: saved.id,
        timezone: 'Australia/Sydney',
      },
      update: {},
    });
    return saved;
  });

  return NextResponse.json({
    id: profile.id,
    displayName: profile.displayName,
    showOrganisationBadge: profile.showOrganisationBadge,
    region: profile.region,
    guidelinesVersion: profile.guidelinesVersion,
  });
}
