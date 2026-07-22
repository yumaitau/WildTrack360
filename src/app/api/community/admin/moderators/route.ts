import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityStaffAdmin } from '@/lib/community/admin';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const grantSchema = z.object({
  profileId: z.string().trim().min(1),
  isModerator: z.boolean(),
});

const profileSelect = {
  id: true,
  displayName: true,
  region: true,
  isModerator: true,
  status: true,
  homeOrganisationName: true,
} as const;

export async function GET() {
  const auth = await requireCommunityStaffAdmin();
  if ('error' in auth) return auth.error;

  const [moderators, candidates] = await Promise.all([
    prisma.communityProfile.findMany({
      where: { isModerator: true },
      orderBy: { displayName: 'asc' },
      select: profileSelect,
    }),
    prisma.communityProfile.findMany({
      where: { isModerator: false, status: 'ACTIVE' },
      orderBy: { displayName: 'asc' },
      take: 200,
      select: profileSelect,
    }),
  ]);
  return NextResponse.json({ moderators, candidates });
}

export async function POST(request: NextRequest) {
  const auth = await requireCommunityStaffAdmin();
  if ('error' in auth) return auth.error;

  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = grantSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const target = await prisma.communityProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true, isModerator: true },
  });
  if (!target) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const profile = await prisma.communityProfile.update({
    where: { id: parsed.data.profileId },
    data: { isModerator: parsed.data.isModerator },
    select: profileSelect,
  });

  logAudit({
    userId: auth.session.userId,
    orgId: auth.session.homeOrgId ?? '',
    action: 'ROLE_CHANGE',
    entity: 'CommunityModerator',
    entityId: profile.id,
    metadata: { isModerator: parsed.data.isModerator },
  });
  console.log(
    `[community-admin] moderator ${parsed.data.isModerator ? 'granted' : 'revoked'} for profile ${profile.id}`
  );

  return NextResponse.json({ profile });
}
