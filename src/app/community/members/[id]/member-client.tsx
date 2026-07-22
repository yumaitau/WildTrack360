'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  BadgeHelp,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Loader2,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSetBreadcrumbLabel } from '@/components/layout/breadcrumb-context';

interface Member {
  id: string;
  displayName: string;
  region: string | null;
  organisationName: string | null;
  isModerator: boolean;
}
interface MemberPost {
  id: string;
  type: 'DISCUSSION' | 'QUESTION';
  title: string | null;
  body: string | null;
  category: { id: string; slug: string; name: string };
  isPinned: boolean;
  acceptedCommentId: string | null;
  commentCount: number;
  reactionCount: number;
  lastActivityAt: string;
}

function relativeTime(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export function CommunityMemberProfile({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [posts, setPosts] = useState<MemberPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useSetBreadcrumbLabel(member?.displayName);

  const load = useCallback(
    async (cursor?: string) => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        const response = await fetch(`/api/community/members/${memberId}?${params}`, {
          cache: 'no-store',
        });
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error('Member could not be loaded');
        const payload = await response.json();
        setMember(payload.member);
        setPosts((prev) => (isInitial ? payload.items : [...prev, ...payload.items]));
        setNextCursor(payload.nextCursor);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Member could not be loaded');
      } finally {
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [memberId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 rounded-xl border bg-background p-6">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 border-b pb-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="mx-auto max-w-3xl py-14 text-center">
        <BadgeHelp className="mx-auto h-10 w-10 text-sage" />
        <h1 className="mt-3 text-lg font-semibold">Member not found</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          This community member may have left or their profile is no longer available.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/community">Back to Community</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-4 rounded-xl border bg-background p-6">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-sage/15 text-base font-semibold text-forest">
            {member.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-forest">{member.displayName}</h1>
            {member.isModerator && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                Moderator
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {member.organisationName && <span>{member.organisationName}</span>}
            {member.region && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {member.region}
              </span>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="member-posts">
        <h2 id="member-posts" className="mb-2 text-sm font-semibold text-muted-foreground">
          Published posts
        </h2>
        {posts.length === 0 ? (
          <div className="py-14 text-center">
            <BadgeHelp className="mx-auto h-10 w-10 text-sage" />
            <h3 className="mt-3 text-lg font-semibold">No published posts yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {member.displayName} hasn&apos;t published anything to the community so far.
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <article key={post.id} className="group border-b py-5 first:pt-1">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <time dateTime={post.lastActivityAt}>
                        {relativeTime(post.lastActivityAt)}
                      </time>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {post.isPinned && (
                        <Badge className="bg-sage/15 text-sage hover:bg-sage/15">Pinned</Badge>
                      )}
                      <Badge variant="outline" className="font-normal">
                        {post.category.name}
                      </Badge>
                      {post.type === 'QUESTION' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ochre">
                          {post.acceptedCommentId ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <CircleHelp className="h-3.5 w-3.5" />
                          )}
                          {post.acceptedCommentId ? 'Answered' : 'Question'}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/community/posts/${post.id}`}
                      className="mt-2 block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <h3 className="text-lg font-semibold leading-snug group-hover:text-forest">
                        {post.title}
                      </h3>
                      <p className="mt-1 line-clamp-3 max-w-[72ch] whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {post.body}
                      </p>
                    </Link>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}
                      </span>
                      <span>{post.reactionCount} reactions</span>
                    </div>
                  </div>
                  <ChevronRight className="mt-8 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </article>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="flex justify-center pt-6">
            <Button variant="outline" onClick={() => load(nextCursor)} disabled={loadingMore}>
              {loadingMore && <Loader2 className="animate-spin" />}
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
