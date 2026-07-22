import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'CHAT_MESSAGE']),
  targetId: z.string().min(1).max(100),
  explanation: z.string().trim().min(10).max(2000),
});

export async function POST(request: Request) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const ownership =
    parsed.data.targetType === 'POST'
      ? await prisma.communityPost.findFirst({
          where: {
            id: parsed.data.targetId,
            authorId: auth.session.profile!.id,
            status: { in: ['HELD', 'REMOVED'] },
          },
          select: { id: true },
        })
      : parsed.data.targetType === 'COMMENT'
        ? await prisma.communityComment.findFirst({
            where: {
              id: parsed.data.targetId,
              authorId: auth.session.profile!.id,
              status: { in: ['HELD', 'REMOVED'] },
            },
            select: { id: true },
          })
        : await prisma.communityChatMessage.findFirst({
            where: {
              id: parsed.data.targetId,
              authorId: auth.session.profile!.id,
              status: { in: ['HELD', 'REMOVED'] },
            },
            select: { id: true },
          });
  if (!ownership) {
    return NextResponse.json({ error: 'Held content not found' }, { status: 404 });
  }
  const existing = await prisma.communityAppeal.findUnique({
    where: {
      appellantId_targetType_targetId: {
        appellantId: auth.session.profile!.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
    },
    select: { id: true, status: true },
  });
  // A still-open appeal is returned unchanged (idempotent resubmit). A terminal
  // one (UPHELD/OVERTURNED) is reopened with the new grounds — content can be
  // removed again for a different reason, so the member must be able to appeal
  // afresh instead of being blocked by the old row.
  if (existing && (existing.status === 'OPEN' || existing.status === 'REVIEWING')) {
    return NextResponse.json(existing, { status: 200 });
  }
  const appeal = existing
    ? await prisma.communityAppeal.update({
        where: { id: existing.id },
        data: {
          explanation: parsed.data.explanation,
          status: 'OPEN',
          reviewerId: null,
          outcomeReason: null,
          reviewedAt: null,
        },
        select: { id: true, status: true },
      })
    : await prisma.communityAppeal.create({
        data: { appellantId: auth.session.profile!.id, ...parsed.data },
        select: { id: true, status: true },
      });
  return NextResponse.json(appeal, { status: 201 });
}
