import { NextResponse } from 'next/server';
import { requireCommunitySession } from '@/lib/community/api';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  const auth = await requireCommunitySession({ write: true, profile: true });
  if ('error' in auth) return auth.error;
  const { roomId, messageId } = await params;

  const message = await prisma.communityChatMessage.findFirst({
    where: { id: messageId, roomId },
    select: { authorId: true, status: true },
  });
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const isOwner = message.authorId === auth.session.profile!.id;
  if (!isOwner && !auth.session.profile!.isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (message.status === 'DELETED' || message.status === 'REMOVED') {
    return new NextResponse(null, { status: 204 });
  }

  // Author self-delete → DELETED; a moderator removing someone else's → REMOVED.
  await prisma.communityChatMessage.update({
    where: { id: messageId },
    data: { status: isOwner ? 'DELETED' : 'REMOVED', deletedAt: new Date() },
  });
  return new NextResponse(null, { status: 204 });
}
