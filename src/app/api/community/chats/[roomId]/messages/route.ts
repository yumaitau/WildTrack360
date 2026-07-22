import { NextRequest, NextResponse } from 'next/server';
import { readJson, requireCommunitySession, validationError } from '@/lib/community/api';
import { getBlockedProfileIds } from '@/lib/community/blocks';
import { communityAuthorDto, communityAuthorSelect } from '@/lib/community/dto';
import {
  resolveCommunityMentions,
  notifyCommunityMentions,
  readStoredMentions,
} from '@/lib/community/mentions';
import {
  enqueueCommunityModeration,
  processCommunityModerationJob,
} from '@/lib/community/moderation/jobs';
import { takeCommunityRateLimit } from '@/lib/community/rate-limit';
import { communityChatMessageSchema } from '@/lib/community/validation';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requireCommunitySession({ profile: true });
  if ('error' in auth) return auth.error;
  const { roomId } = await params;
  const cursor = request.nextUrl.searchParams.get('cursor');
  const room = await prisma.communityChatRoom.findFirst({
    where: { id: roomId, isArchived: false },
    select: { id: true, name: true, description: true, isReadOnly: true, slowModeSeconds: true },
  });
  if (!room) return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
  const blockedIds = await getBlockedProfileIds(auth.session.profile!.id);
  const rows = await prisma.communityChatMessage.findMany({
    where: {
      roomId,
      // Hide blocked members' messages from the viewer's room view.
      ...(blockedIds.length ? { authorId: { notIn: blockedIds } } : {}),
      OR: [
        { status: 'PUBLISHED' },
        { authorId: auth.session.profile!.id, status: { in: ['PENDING', 'HELD'] } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: communityAuthorSelect },
      reactions: { select: { type: true } },
    },
  });
  const hasMore = rows.length > 50;
  return NextResponse.json({
    room,
    viewerIsModerator: auth.session.profile!.isModerator,
    items: rows
      .slice(0, 50)
      .reverse()
      .map((message) => ({
        id: message.id,
        parentId: message.parentId,
        body: message.body ?? message.draftBody,
        status: message.status,
        isOwner: message.authorId === auth.session.profile!.id,
        author: communityAuthorDto(message.author),
        mentions: readStoredMentions(message.mentions),
        reactions: message.reactions,
        createdAt: message.createdAt.toISOString(),
      })),
    nextCursor: hasMore ? rows[49].id : null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const body = await readJson(request);
  if ('error' in body) return body.error;
  const parsed = communityChatMessageSchema.safeParse(body.data);
  if (!parsed.success) return validationError(parsed.error.issues);
  const { roomId } = await params;
  const room = await prisma.communityChatRoom.findFirst({
    where: { id: roomId, isArchived: false },
  });
  if (!room) return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
  if (room.isReadOnly && !auth.session.profile!.isModerator) {
    return NextResponse.json({ error: 'This room is read-only' }, { status: 403 });
  }
  if (room.slowModeSeconds > 0 && !auth.session.profile!.isModerator) {
    const previous = await prisma.communityChatMessage.findFirst({
      where: { roomId, authorId: auth.session.profile!.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (previous && Date.now() - previous.createdAt.getTime() < room.slowModeSeconds * 1000) {
      return NextResponse.json(
        { error: `Slow mode is on. Wait ${room.slowModeSeconds} seconds.` },
        { status: 429 }
      );
    }
  }
  if (parsed.data.parentId) {
    const parent = await prisma.communityChatMessage.findFirst({
      where: { id: parsed.data.parentId, roomId, status: 'PUBLISHED' },
    });
    if (!parent) return NextResponse.json({ error: 'Reply target not found' }, { status: 404 });
  }
  const rate = await takeCommunityRateLimit(auth.session.profile!.id, 'chat');
  if (!rate.allowed) return NextResponse.json({ error: 'Chat limit reached' }, { status: 429 });
  const mentions = await resolveCommunityMentions(prisma, {
    body: parsed.data.body,
    submitted: parsed.data.mentions,
    authorProfileId: auth.session.profile!.id,
  });
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.communityChatMessage.findUnique({
      where: {
        authorId_clientMutationId: {
          authorId: auth.session.profile!.id,
          clientMutationId: parsed.data.clientMutationId,
        },
      },
      select: { id: true },
    });
    if (existing) return { message: existing, jobId: null as string | null };
    const message = await tx.communityChatMessage.create({
      data: {
        roomId,
        authorId: auth.session.profile!.id,
        parentId: parsed.data.parentId ?? null,
        draftBody: parsed.data.body,
        mentions: mentions.length ? mentions : undefined,
        clientMutationId: parsed.data.clientMutationId,
      },
      select: { id: true },
    });
    const job = await enqueueCommunityModeration(tx, {
      targetType: 'CHAT_MESSAGE',
      targetId: message.id,
      body: parsed.data.body,
    });
    return { message, jobId: job.id };
  });
  const moderation = result.jobId ? await processCommunityModerationJob(result.jobId) : null;
  const saved = await prisma.communityChatMessage.findUniqueOrThrow({
    where: { id: result.message.id },
    select: { id: true, status: true },
  });
  // Chat mentions notify once the message is live; the link deep-links to the room.
  if (saved.status === 'PUBLISHED' && result.jobId && mentions.length) {
    await prisma.$transaction((tx) =>
      notifyCommunityMentions(tx, {
        mentions,
        actorId: auth.session.profile!.id,
        actorName: auth.session.profile!.displayName,
        contentId: saved.id,
        targetType: 'CHAT_MESSAGE',
        targetId: roomId,
      })
    );
  }
  return NextResponse.json(
    { ...saved, moderation: moderation?.recommendation ?? 'EXISTING' },
    { status: result.jobId ? 201 : 200 }
  );
}
