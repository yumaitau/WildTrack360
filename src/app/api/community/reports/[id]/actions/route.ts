import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, validationError } from '@/lib/community/api';
import { requireCommunityModerator } from '@/lib/community/admin';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  action: z.enum(['DISMISS', 'REMOVE']),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCommunityModerator();
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { id } = await params;

  const report = await prisma.communityReport.findUnique({ where: { id } });
  if (!report || (report.status !== 'OPEN' && report.status !== 'REVIEWING')) {
    return NextResponse.json({ error: 'Report is no longer open' }, { status: 409 });
  }

  const applied = await prisma.$transaction(async (tx) => {
    // Atomic claim so two moderators can't both resolve the same report.
    const claim = await tx.communityReport.updateMany({
      where: { id: report.id, status: { in: ['OPEN', 'REVIEWING'] } },
      data: { status: 'REVIEWING' },
    });
    if (claim.count !== 1) return false;

    if (parsed.data.action === 'REMOVE') {
      // Take the reported content down and close every open report on it —
      // multiple reporters shouldn't each need a separate decision.
      let authorId: string | null = null;
      if (report.targetType === 'POST') {
        const target = await tx.communityPost.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        authorId = target?.authorId ?? null;
        if (target) {
          await tx.communityPost.update({
            where: { id: report.targetId },
            data: { status: 'REMOVED' },
          });
        }
      } else if (report.targetType === 'COMMENT') {
        const target = await tx.communityComment.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        authorId = target?.authorId ?? null;
        if (target) {
          await tx.communityComment.update({
            where: { id: report.targetId },
            data: { status: 'REMOVED' },
          });
          // Drop any accepted-answer pointer at this comment so its question
          // doesn't keep showing "Answered" with the answer gone.
          await tx.communityPost.updateMany({
            where: { acceptedCommentId: report.targetId },
            data: { acceptedCommentId: null },
          });
        }
      } else {
        const target = await tx.communityChatMessage.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        authorId = target?.authorId ?? null;
        if (target) {
          await tx.communityChatMessage.update({
            where: { id: report.targetId },
            data: { status: 'REMOVED' },
          });
        }
      }
      await tx.communityReport.updateMany({
        where: {
          targetType: report.targetType,
          targetId: report.targetId,
          status: { in: ['OPEN', 'REVIEWING'] },
        },
        data: { status: 'RESOLVED', reviewedAt: new Date() },
      });
      if (authorId && authorId !== auth.session.profile!.id) {
        await tx.communityNotification.upsert({
          where: {
            recipientId_dedupeKey: {
              recipientId: authorId,
              dedupeKey: `report-remove:${report.targetType}:${report.targetId}`,
            },
          },
          create: {
            recipientId: authorId,
            actorId: auth.session.profile!.id,
            type: 'MODERATION_DECISION',
            targetType: report.targetType,
            targetId: report.targetId,
            title: 'Your Community contribution was removed after a report',
            dedupeKey: `report-remove:${report.targetType}:${report.targetId}`,
          },
          update: {},
        });
      }
    } else {
      await tx.communityReport.update({
        where: { id: report.id },
        data: { status: 'DISMISSED', reviewedAt: new Date() },
      });
    }

    // Close the loop for the reporter regardless of outcome.
    if (report.reporterId !== auth.session.profile!.id) {
      await tx.communityNotification.upsert({
        where: {
          recipientId_dedupeKey: {
            recipientId: report.reporterId,
            dedupeKey: `report:${report.id}:outcome`,
          },
        },
        create: {
          recipientId: report.reporterId,
          type: 'REPORT_OUTCOME',
          targetType: report.targetType,
          targetId: report.targetId,
          title:
            parsed.data.action === 'REMOVE'
              ? 'Thanks — the content you reported was removed'
              : 'Thanks — we reviewed your report',
          dedupeKey: `report:${report.id}:outcome`,
        },
        update: {},
      });
    }
    return true;
  });

  if (!applied) return NextResponse.json({ error: 'Report is no longer open' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
