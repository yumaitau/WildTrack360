import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityModerator } from '@/lib/community/admin';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  // UPHOLD keeps the original moderation decision (content stays removed/held);
  // OVERTURN restores the content to the community.
  action: z.enum(['UPHOLD', 'OVERTURN']),
  reason: z.string().trim().max(280).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id } = await params;

  const appeal = await prisma.communityAppeal.findUnique({ where: { id } });
  if (!appeal || (appeal.status !== 'OPEN' && appeal.status !== 'REVIEWING')) {
    return NextResponse.json({ error: 'Appeal is no longer open' }, { status: 409 });
  }

  const applied = await prisma.$transaction(async (tx) => {
    // Atomic claim so two moderators can't both resolve the same appeal.
    const claim = await tx.communityAppeal.updateMany({
      where: { id: appeal.id, status: { in: ['OPEN', 'REVIEWING'] } },
      data: { status: 'REVIEWING' },
    });
    if (claim.count !== 1) return false;

    if (parsed.data.action === 'OVERTURN') {
      // Restore only content that is still HELD/REMOVED — never resurrect a
      // post the author has since DELETED, and never republish a draft that
      // has already moved on.
      if (appeal.targetType === 'POST') {
        const target = await tx.communityPost.findFirst({
          where: { id: appeal.targetId, status: { in: ['HELD', 'REMOVED'] } },
          select: { draftTitle: true, draftBody: true },
        });
        if (target) {
          await tx.communityPost.update({
            where: { id: appeal.targetId },
            data: { title: target.draftTitle, body: target.draftBody, status: 'PUBLISHED' },
          });
        }
      } else if (appeal.targetType === 'COMMENT') {
        const target = await tx.communityComment.findFirst({
          where: { id: appeal.targetId, status: { in: ['HELD', 'REMOVED'] } },
          select: { draftBody: true },
        });
        if (target) {
          await tx.communityComment.update({
            where: { id: appeal.targetId },
            data: { body: target.draftBody, status: 'PUBLISHED' },
          });
        }
      } else {
        const target = await tx.communityChatMessage.findFirst({
          where: { id: appeal.targetId, status: { in: ['HELD', 'REMOVED'] } },
          select: { draftBody: true },
        });
        if (target) {
          await tx.communityChatMessage.update({
            where: { id: appeal.targetId },
            data: { body: target.draftBody, status: 'PUBLISHED' },
          });
        }
      }
    }

    await tx.communityAppeal.update({
      where: { id: appeal.id },
      data: {
        status: parsed.data.action === 'OVERTURN' ? 'OVERTURNED' : 'UPHELD',
        reviewerId: auth.session.profile!.id,
        outcomeReason: parsed.data.reason ?? null,
        reviewedAt: new Date(),
      },
    });

    if (appeal.appellantId !== auth.session.profile!.id) {
      await tx.communityNotification.upsert({
        where: {
          recipientId_dedupeKey: {
            recipientId: appeal.appellantId,
            dedupeKey: `appeal:${appeal.id}:outcome`,
          },
        },
        create: {
          recipientId: appeal.appellantId,
          actorId: auth.session.profile!.id,
          type: 'APPEAL_OUTCOME',
          targetType: appeal.targetType,
          targetId: appeal.targetId,
          title:
            parsed.data.action === 'OVERTURN'
              ? 'Your appeal was upheld — your content is back'
              : 'Your appeal was reviewed',
          dedupeKey: `appeal:${appeal.id}:outcome`,
        },
        update: {},
      });
    }
    return true;
  });

  if (!applied) return NextResponse.json({ error: 'Appeal is no longer open' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
