import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityModerator } from '@/lib/community/admin';
import { isPlatformAdmin } from '@/lib/community/platform-admin';
import { issueSanction } from '@/lib/community/sanctions';
import { prisma } from '@/lib/prisma';

const LIMIT = 30;

const schema = z
  .object({
    profileId: z.string().min(1),
    type: z.enum(['WARNING', 'MUTE', 'BAN']),
    reason: z.string().trim().min(3).max(500),
    endsAt: z.string().datetime().optional(),
    confirm: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'MUTE') {
      if (!val.endsAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'endsAt is required for a mute',
        });
      } else if (new Date(val.endsAt).getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'endsAt must be in the future',
        });
      }
    }
  });

export async function GET(request: NextRequest) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const cursor = request.nextUrl.searchParams.get('cursor');
  const rows = await prisma.communitySanction.findMany({
    orderBy: { createdAt: 'desc' },
    take: LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      reason: true,
      scope: true,
      startsAt: true,
      endsAt: true,
      revokedAt: true,
      createdAt: true,
      profileId: true,
      profile: { select: { displayName: true } },
    },
  });

  const nextCursor = rows.length > LIMIT ? rows[LIMIT - 1].id : null;
  const sanctions = rows.slice(0, LIMIT).map((s) => ({
    id: s.id,
    type: s.type,
    reason: s.reason,
    scope: s.scope,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    revokedAt: s.revokedAt,
    createdAt: s.createdAt,
    profileId: s.profileId,
    displayName: s.profile.displayName,
  }));

  return NextResponse.json({ sanctions, nextCursor });
}

export async function POST(request: NextRequest) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;

  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { profileId, type, reason, endsAt, confirm } = parsed.data;

  if (type === 'BAN' && confirm !== true) {
    return NextResponse.json(
      { error: 'Permanent ban requires confirmation', requiresConfirmation: true },
      { status: 422 }
    );
  }

  const target = await prisma.communityProfile.findUnique({
    where: { id: profileId },
    select: { id: true, isModerator: true, clerkUserId: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Community profile not found' }, { status: 404 });
  }
  // A moderator can't sanction themselves out of the queue, and only a platform
  // admin may sanction another moderator/platform admin.
  if (target.id === auth.session.profile!.id) {
    return NextResponse.json({ error: 'You cannot sanction your own account' }, { status: 400 });
  }
  if (
    (target.isModerator || isPlatformAdmin(target.clerkUserId)) &&
    !auth.session.isPlatformAdmin
  ) {
    return NextResponse.json(
      { error: 'Only a platform admin can sanction another moderator' },
      { status: 403 }
    );
  }

  const sanction = await issueSanction({
    targetProfileId: profileId,
    actorProfileId: auth.session.profile!.id,
    type,
    reason,
    endsAt: endsAt ? new Date(endsAt) : null,
  });

  console.log(
    `[community-admin] sanction ${type} issued sanction=${sanction.id} target=${profileId}`
  );

  return NextResponse.json({ sanction }, { status: 201 });
}
