import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Lock, MessageSquare, Pin } from 'lucide-react';
import { CommunityFeedback } from '@/components/community/community-feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCommunitySession } from '@/lib/community/access';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Community chats · WildTrack360' };

export default async function CommunityChatsPage() {
  const session = await getCommunitySession();
  if (!session?.access.canRead) redirect('/dashboard');
  if (!session.profile || !session.hasAcceptedGuidelines) redirect('/community/onboarding');
  const rooms = await prisma.communityChatRoom.findMany({
    where: { isArchived: false },
    orderBy: [{ isPinned: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { messages: { where: { status: 'PUBLISHED' } } } } },
  });
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3">
            <Link href="/community">
              <ArrowLeft /> Community
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Topic chats</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Persistent, staff-managed rooms for useful conversations across ranger organisations.
          </p>
        </div>
        <CommunityFeedback />
      </div>
      <div className="divide-y rounded-xl border bg-background">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/community/chats/${room.id}`}
            className="group flex items-start gap-4 px-5 py-5 first:rounded-t-xl last:rounded-b-xl hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <div className="rounded-lg bg-sage/15 p-2.5 text-sage">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold group-hover:text-forest">{room.name}</h2>
                {room.isPinned && (
                  <Badge variant="outline" className="gap-1">
                    <Pin className="h-3 w-3" /> Pinned
                  </Badge>
                )}
                {room.isReadOnly && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" /> Read-only
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{room.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {room._count.messages} messages
                {room.slowModeSeconds > 0 ? ` · ${room.slowModeSeconds}s slow mode` : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
