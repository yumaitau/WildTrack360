import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { getBlockedProfileIds } from '@/lib/community/blocks';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  ids: z.array(z.string().min(1).max(100)).max(100).optional(),
  markAllRead: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const cursor = request.nextUrl.searchParams.get('cursor');
  // Suppress notifications whose actor the viewer has blocked (null-actor
  // system notifications are kept — they're not "in" the blocked list).
  const blockedIds = await getBlockedProfileIds(auth.session.profile!.id);
  const rows = await prisma.communityNotification.findMany({
    where: {
      recipientId: auth.session.profile!.id,
      ...(blockedIds.length ? { actorId: { notIn: blockedIds } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      targetType: true,
      targetId: true,
      title: true,
      readAt: true,
      createdAt: true,
      actor: { select: { displayName: true } },
    },
  });
  const hasMore = rows.length > 50;
  return NextResponse.json({
    items: rows.slice(0, 50),
    nextCursor: hasMore ? rows[49].id : null,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  await prisma.communityNotification.updateMany({
    where: {
      recipientId: auth.session.profile!.id,
      ...(parsed.data.markAllRead ? {} : { id: { in: parsed.data.ids ?? [] } }),
    },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
