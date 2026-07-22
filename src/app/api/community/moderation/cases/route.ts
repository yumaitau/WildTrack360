import { NextRequest, NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { prisma } from '@/lib/prisma';

type TargetRef = { targetType: 'POST' | 'COMMENT' | 'CHAT_MESSAGE'; targetId: string };
type TargetContent = { title: string | null; body: string; status: string };

// Resolve the actual content behind each report/appeal so a moderator can see
// WHAT they are acting on (post vs comment, and its text) before removing it —
// acting on a raw "POST · <id>" line blind is how a comment report ends up
// taking down the whole post.
async function resolveTargetContent(refs: TargetRef[]): Promise<Map<string, TargetContent>> {
  const idsFor = (type: TargetRef['targetType']) => [
    ...new Set(refs.filter((r) => r.targetType === type).map((r) => r.targetId)),
  ];
  const postIds = idsFor('POST');
  const commentIds = idsFor('COMMENT');
  const chatIds = idsFor('CHAT_MESSAGE');
  const [posts, comments, chats] = await Promise.all([
    postIds.length
      ? prisma.communityPost.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            title: true,
            draftTitle: true,
            body: true,
            draftBody: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.communityComment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, body: true, draftBody: true, status: true },
        })
      : Promise.resolve([]),
    chatIds.length
      ? prisma.communityChatMessage.findMany({
          where: { id: { in: chatIds } },
          select: { id: true, body: true, draftBody: true, status: true },
        })
      : Promise.resolve([]),
  ]);
  const map = new Map<string, TargetContent>();
  for (const p of posts)
    map.set(`POST:${p.id}`, {
      title: p.title ?? p.draftTitle,
      body: p.body ?? p.draftBody,
      status: p.status,
    });
  for (const c of comments)
    map.set(`COMMENT:${c.id}`, { title: null, body: c.body ?? c.draftBody, status: c.status });
  for (const m of chats)
    map.set(`CHAT_MESSAGE:${m.id}`, { title: null, body: m.body ?? m.draftBody, status: m.status });
  return map;
}

export async function GET(request: NextRequest) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  if (!auth.session.profile!.isModerator && !auth.session.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const jobCursor = request.nextUrl.searchParams.get('jobCursor');
  const reportCursor = request.nextUrl.searchParams.get('reportCursor');
  const appealCursor = request.nextUrl.searchParams.get('appealCursor');
  const [jobs, reports, appeals] = await Promise.all([
    prisma.communityModerationJob.findMany({
      where: { status: 'NEEDS_REVIEW' },
      orderBy: { createdAt: 'asc' },
      take: 51,
      ...(jobCursor ? { cursor: { id: jobCursor }, skip: 1 } : {}),
      select: {
        id: true,
        targetType: true,
        targetId: true,
        title: true,
        body: true,
        contentHash: true,
        policyVersion: true,
        modelId: true,
        createdAt: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { recommendation: true, categories: true, reasonCode: true, severity: true },
        },
      },
    }),
    prisma.communityReport.findMany({
      where: { status: { in: ['OPEN', 'REVIEWING'] } },
      orderBy: { createdAt: 'asc' },
      take: 51,
      ...(reportCursor ? { cursor: { id: reportCursor }, skip: 1 } : {}),
      // Reporter identity intentionally omitted.
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.communityAppeal.findMany({
      where: { status: { in: ['OPEN', 'REVIEWING'] } },
      orderBy: { createdAt: 'asc' },
      take: 51,
      ...(appealCursor ? { cursor: { id: appealCursor }, skip: 1 } : {}),
      select: {
        id: true,
        targetType: true,
        targetId: true,
        explanation: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);
  const slicedReports = reports.slice(0, 50);
  const slicedAppeals = appeals.slice(0, 50);
  const content = await resolveTargetContent([...slicedReports, ...slicedAppeals]);
  const attach = <T extends TargetRef>(row: T) => ({
    ...row,
    content: content.get(`${row.targetType}:${row.targetId}`) ?? null,
  });
  return NextResponse.json({
    jobs: jobs.slice(0, 50),
    reports: slicedReports.map(attach),
    appeals: slicedAppeals.map(attach),
    nextCursors: {
      jobs: jobs.length > 50 ? jobs[49].id : null,
      reports: reports.length > 50 ? reports[49].id : null,
      appeals: appeals.length > 50 ? appeals[49].id : null,
    },
  });
}
