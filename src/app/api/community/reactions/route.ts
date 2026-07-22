import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityReactionSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

const targetSchema = communityReactionSchema.extend({
  targetType: z.enum(['POST', 'COMMENT', 'CHAT_MESSAGE']),
  targetId: z.string().min(1).max(100),
});

async function targetExists(targetType: string, targetId: string) {
  if (targetType === 'POST') {
    return prisma.communityPost.findFirst({
      where: { id: targetId, status: 'PUBLISHED' },
      select: { id: true },
    });
  }
  if (targetType === 'COMMENT') {
    return prisma.communityComment.findFirst({
      where: { id: targetId, status: 'PUBLISHED' },
      select: { id: true },
    });
  }
  return prisma.communityChatMessage.findFirst({
    where: { id: targetId, status: 'PUBLISHED' },
    select: { id: true },
  });
}

function targetData(targetType: 'POST' | 'COMMENT' | 'CHAT_MESSAGE', targetId: string) {
  return targetType === 'POST'
    ? { postId: targetId }
    : targetType === 'COMMENT'
      ? { commentId: targetId }
      : { chatMessageId: targetId };
}

export async function PUT(request: Request) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = targetSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  if (!(await targetExists(parsed.data.targetType, parsed.data.targetId))) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }
  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'reaction');
  if (!rate.allowed) return NextResponse.json({ error: 'Reaction limit reached' }, { status: 429 });
  const data = targetData(parsed.data.targetType, parsed.data.targetId);
  // createMany + skipDuplicates makes a double-tap idempotent without the
  // findFirst-then-create race that violated the unique constraint (→ 500).
  await prisma.communityReaction.createMany({
    data: [{ profileId: auth.session.profile!.id, type: parsed.data.type, ...data }],
    skipDuplicates: true,
  });
  return NextResponse.json({ reacted: true });
}

export async function DELETE(request: Request) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = targetSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  await prisma.communityReaction.deleteMany({
    where: {
      profileId: auth.session.profile!.id,
      type: parsed.data.type,
      ...targetData(parsed.data.targetType, parsed.data.targetId),
    },
  });
  return NextResponse.json({ reacted: false });
}
