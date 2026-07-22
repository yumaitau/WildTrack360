import { NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityReportSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

async function reportableTargetExists(targetType: string, targetId: string) {
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

export async function POST(request: Request) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityReportSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  if (!(await reportableTargetExists(parsed.data.targetType, parsed.data.targetId))) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }
  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'report');
  if (!rate.allowed) return NextResponse.json({ error: 'Report limit reached' }, { status: 429 });
  const report = await prisma.communityReport.upsert({
    where: {
      reporterId_targetType_targetId: {
        reporterId: auth.session.profile!.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
    },
    create: {
      reporterId: auth.session.profile!.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    },
    update: {},
    select: { id: true, status: true },
  });
  return NextResponse.json(report, { status: 201 });
}
