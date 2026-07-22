import { NextRequest, NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { getCommunityFeed } from '@/lib/community/feed';
import { resolveCommunityMentions, notifyCommunityMentions } from '@/lib/community/mentions';
import {
  enqueueCommunityModeration,
  processCommunityModerationJob,
} from '@/lib/community/moderation/jobs';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityPostSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const { searchParams } = request.nextUrl;

  const feed = await getCommunityFeed(auth.session.profile!.id, {
    view: searchParams.get('view') ?? 'latest',
    category: searchParams.get('category'),
    cursor: searchParams.get('cursor'),
    sort: searchParams.get('sort') ?? 'active',
  });

  return NextResponse.json(feed);
}

export async function POST(request: NextRequest) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityPostSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);

  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'post');
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Post limit reached. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }
  const category = await prisma.communityCategory.findFirst({
    where: { id: parsed.data.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const mentions = await resolveCommunityMentions(prisma, {
    body: parsed.data.body,
    submitted: parsed.data.mentions,
    authorProfileId: auth.session.profile!.id,
  });

  const asDraft = parsed.data.asDraft === true;
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.communityPost.findUnique({
      where: {
        authorId_clientMutationId: {
          authorId: auth.session.profile!.id,
          clientMutationId: parsed.data.clientMutationId,
        },
      },
      select: { id: true, status: true },
    });
    if (existing) return { post: existing, jobId: null as string | null, created: false };

    const post = await tx.communityPost.create({
      data: {
        authorId: auth.session.profile!.id,
        categoryId: parsed.data.categoryId,
        type: parsed.data.type,
        // A draft is author-only staging: parked as DRAFT with no moderation
        // job. Publishing (POST /publish) moves it to PENDING + moderates.
        status: asDraft ? 'DRAFT' : 'PENDING',
        draftTitle: parsed.data.title,
        draftBody: parsed.data.body,
        mentions: mentions.length ? mentions : undefined,
        clientMutationId: parsed.data.clientMutationId,
      },
      select: { id: true, status: true },
    });
    if (asDraft) return { post, jobId: null as string | null, created: true };
    const job = await enqueueCommunityModeration(tx, {
      targetType: 'POST',
      targetId: post.id,
      title: parsed.data.title,
      body: parsed.data.body,
    });
    return { post, jobId: job.id, created: true };
  });

  const moderation = result.jobId ? await processCommunityModerationJob(result.jobId) : null;
  const saved = await prisma.communityPost.findUniqueOrThrow({
    where: { id: result.post.id },
    select: { id: true, status: true },
  });
  // Mentions notify only once the post is live (mirrors the inline REPLY
  // producer), and only for a freshly created post — never an idempotent replay.
  if (saved.status === 'PUBLISHED' && result.jobId && mentions.length) {
    await prisma.$transaction((tx) =>
      notifyCommunityMentions(tx, {
        mentions,
        actorId: auth.session.profile!.id,
        actorName: auth.session.profile!.displayName,
        contentId: saved.id,
        targetType: 'POST',
        targetId: saved.id,
      })
    );
  }
  return NextResponse.json(
    {
      ...saved,
      moderation: moderation?.recommendation ?? (result.created && asDraft ? 'DRAFT' : 'EXISTING'),
    },
    { status: result.created ? 201 : 200 }
  );
}
