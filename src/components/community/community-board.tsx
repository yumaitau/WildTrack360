'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeHelp,
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { CommunityFeedback } from './community-feedback';
import { CommunityNotificationBell } from './community-notification-bell';
import { FieldStatus, validateCommunityText } from './field-status';
import { MentionTextarea } from './mention-textarea';
import type { MentionRef } from './rich-text';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}
interface Post {
  id: string;
  type: 'DISCUSSION' | 'QUESTION';
  title: string;
  body: string;
  author: {
    id: string;
    displayName: string;
    organisationName: string | null;
    region: string | null;
    isModerator: boolean;
  };
  category: { slug: string; name: string };
  status?: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'HELD' | 'REMOVED' | 'DELETED';
  isPinned: boolean;
  isFollowing: boolean;
  isBookmarked?: boolean;
  acceptedCommentId: string | null;
  commentCount: number;
  reactionCount: number;
  lastActivityAt: string;
}
interface Room {
  id: string;
  name: string;
  description: string | null;
  messageCount: number;
  isPinned: boolean;
}

const views = [
  ['latest', 'Latest'],
  ['questions', 'Questions'],
  ['unanswered', 'Unanswered'],
  ['following', 'Following'],
  ['saved', 'Saved'],
  ['drafts', 'Drafts'],
  ['mine', 'Mine'],
] as const;

const sorts = [
  ['active', 'Recent activity'],
  ['new', 'Newest'],
] as const;

const statusLabels: Record<NonNullable<Post['status']>, string> = {
  DRAFT: 'Draft',
  PENDING: "Awaiting Wally's check",
  PUBLISHED: 'Published',
  HELD: 'In review',
  REMOVED: 'Removed',
  DELETED: 'Deleted',
};

function relativeTime(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export function CommunityBoard({
  initialFeed,
  initialRooms,
}: {
  initialFeed?: { items: Post[]; categories: Category[]; nextCursor: string | null };
  initialRooms?: Room[];
} = {}) {
  const [view, setView] = useState('latest');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('active');
  const [posts, setPosts] = useState<Post[]>(initialFeed?.items ?? []);
  const [categories, setCategories] = useState<Category[]>(initialFeed?.categories ?? []);
  const [rooms, setRooms] = useState<Room[]>(initialRooms ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialFeed?.nextCursor ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(!initialFeed);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState<'DISCUSSION' | 'QUESTION'>('DISCUSSION');
  const [postCategory, setPostCategory] = useState(initialFeed?.categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<MentionRef[]>([]);
  const [similarQuestions, setSimilarQuestions] = useState<{ id: string; title: string | null }[]>(
    []
  );
  // Skip the initial client fetch when the server seeded the default feed; every
  // later view/category change still refetches. The ref guards only the mount run.
  const skipInitialLoad = useRef(Boolean(initialFeed));

  // Duplicate-question hint: while composing a QUESTION, debounce a search over
  // the title and surface similar existing posts so people can find an answer
  // (or a thread to join) instead of re-asking. Reuses /api/community/search.
  useEffect(() => {
    if (!composerOpen || postType !== 'QUESTION' || title.trim().length < 8) {
      setSimilarQuestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/community/search?q=${encodeURIComponent(title.trim())}`,
          { cache: 'no-store', signal: controller.signal }
        );
        if (!response.ok) return;
        const payload = await response.json();
        setSimilarQuestions((payload.results ?? []).slice(0, 4));
      } catch {
        // Aborted or offline — the hint is best-effort, never blocks composing.
      }
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [composerOpen, postType, title]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, sort });
      if (category !== 'all') params.set('category', category);
      const [postResponse, roomResponse] = await Promise.all([
        fetch(`/api/community/posts?${params}`, { cache: 'no-store' }),
        fetch('/api/community/chats', { cache: 'no-store' }),
      ]);
      if (!postResponse.ok || !roomResponse.ok) throw new Error('Community could not be loaded');
      const postPayload = await postResponse.json();
      setPosts(postPayload.items);
      setCategories(postPayload.categories);
      setNextCursor(postPayload.nextCursor ?? null);
      setRooms(await roomResponse.json());
      if (postPayload.categories[0]) {
        setPostCategory((current) => current || postPayload.categories[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Community could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [category, view, sort]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ view, sort, cursor: nextCursor });
      if (category !== 'all') params.set('category', category);
      const response = await fetch(`/api/community/posts?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('More posts could not be loaded');
      const payload = await response.json();
      // De-dupe against what's already rendered so a post bumped between page
      // fetches can't appear twice.
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...payload.items.filter((post: Post) => !seen.has(post.id))];
      });
      setNextCursor(payload.nextCursor ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'More posts could not be loaded');
    } finally {
      setLoadingMore(false);
    }
  }, [category, view, sort, nextCursor, loadingMore]);

  useEffect(() => {
    if (skipInitialLoad.current && view === 'latest' && category === 'all' && sort === 'active') {
      skipInitialLoad.current = false;
      return;
    }
    skipInitialLoad.current = false;
    void load();
  }, [load, view, category, sort]);

  function postProblem() {
    if (!postCategory) return 'Choose a category for your post.';
    return (
      validateCommunityText(title, { min: 6, max: 160, field: 'Title' }) ??
      validateCommunityText(body, { min: 20, max: 10_000, field: 'Post' })
    );
  }

  async function createPost(asDraft = false) {
    const problem = postProblem();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: postType,
          categoryId: postCategory,
          title,
          body,
          mentions,
          asDraft,
          clientMutationId: crypto.randomUUID(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Post could not be submitted');
      const statusCopy =
        payload.status === 'DRAFT'
          ? "Saved to your drafts. Publish it when you're ready."
          : payload.status === 'PUBLISHED'
            ? 'Wally checked your post and it is now live.'
            : payload.status === 'HELD'
              ? 'Your post is waiting for a human moderator.'
              : "Your post is queued for Wally's check.";
      toast.success(statusCopy);
      setTitle('');
      setBody('');
      setMentions([]);
      setComposerOpen(false);
      if (asDraft) setView('drafts');
      else await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Post could not be submitted');
    } finally {
      setSubmitting(false);
    }
  }

  async function publishDraft(id: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/community/posts/${id}/publish`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Draft could not be published');
      toast.success(
        payload.moderation === 'PUBLISH'
          ? 'Wally checked your post and it is now live.'
          : 'Your post is queued for a moderation check.'
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Draft could not be published');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Community</h1>
            <Badge className="border-ochre/30 bg-ochre/15 text-ochre hover:bg-ochre/15">Beta</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Share practical knowledge with verified people from participating ranger organisations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CommunityNotificationBell />
          <Button variant="ghost" asChild>
            <Link href="/community/settings/notifications">
              <Bell /> Notification settings
            </Link>
          </Button>
          <CommunityFeedback />
          <Button onClick={() => setComposerOpen((value) => !value)}>
            <Plus />
            Create post
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-sage/35 bg-sage/10 px-4 py-3 sm:flex-row sm:items-center">
        <Sparkles className="h-5 w-5 shrink-0 text-sage" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-forest">Help shape this community</p>
          <p className="text-xs text-muted-foreground">
            Community is shared across organisations. Operational WildTrack360 records are never
            posted automatically.
          </p>
        </div>
        <Link
          href="/community/guidelines"
          className="text-xs font-medium text-forest hover:underline"
        >
          Read community guidelines
        </Link>
      </section>

      {composerOpen && (
        <section
          className="rounded-lg border bg-background p-4 shadow-sm sm:p-5"
          aria-labelledby="new-community-post"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 id="new-community-post" className="text-lg font-semibold">
                Start a conversation
              </h2>
              <p className="text-xs text-muted-foreground">
                Wally checks new and edited content before it appears to other people.
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Pre-publication check
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Post type</Label>
              <Select
                value={postType}
                onValueChange={(value) => setPostType(value as typeof postType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCUSSION">Discussion</SelectItem>
                  <SelectItem value="QUESTION">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={postCategory} onValueChange={setPostCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="community-post-title">Title</Label>
            <Input
              id="community-post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              aria-invalid={title.trim().length > 0 && title.trim().length < 6}
            />
            <FieldStatus value={title} min={6} max={160} />
            {postType === 'QUESTION' && similarQuestions.length > 0 && (
              <div className="rounded-md border border-sage/40 bg-sage/10 px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-forest">
                  <BadgeHelp className="h-3.5 w-3.5" /> Similar questions already asked
                </p>
                <ul className="mt-1.5 space-y-1">
                  {similarQuestions.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/community/posts/${q.id}`}
                        target="_blank"
                        className="line-clamp-1 text-xs text-forest hover:underline"
                      >
                        {q.title ?? 'Untitled question'}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Check these first — you might find an answer or a thread to join.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="community-post-body">
              What would be useful for other ranger teams to know?
            </Label>
            <MentionTextarea
              id="community-post-body"
              value={body}
              onValueChange={setBody}
              mentions={mentions}
              onMentionsChange={setMentions}
              rows={7}
              maxLength={10000}
              aria-invalid={body.trim().length > 0 && body.trim().length < 20}
            />
            <FieldStatus value={body} min={20} max={10_000} />
            <p className="text-xs text-muted-foreground">Type @ to mention another member.</p>
          </div>
          <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Do not include confidential records, personal information, emergencies, exact wildlife
            locations or culturally restricted information.
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => createPost(true)} disabled={submitting}>
              Save draft
            </Button>
            <Button onClick={() => createPost(false)} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              {submitting ? 'Checking…' : 'Submit for check'}
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto" aria-label="Community feed views">
              {views.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    view === value
                      ? 'bg-forest text-cream'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Sort posts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorts.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter by category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item.id} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-5" aria-label="Loading community posts">
              {[0, 1, 2].map((item) => (
                <div key={item} className="space-y-3 border-b pb-5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-7 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-14 text-center">
              <BadgeHelp className="mx-auto h-10 w-10 text-sage" />
              <h2 className="mt-3 text-lg font-semibold">
                {view === 'mine'
                  ? "You haven't posted yet"
                  : view === 'drafts'
                    ? 'No drafts saved'
                    : view === 'saved'
                      ? 'Nothing saved yet'
                      : 'No conversations here yet'}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {view === 'mine'
                  ? "Posts you submit appear here — including anything still waiting on Wally's check or a moderator."
                  : view === 'drafts'
                    ? "Save a post as a draft to park it here until you're ready to submit it for Wally's check."
                    : view === 'saved'
                      ? 'Bookmark a post to keep it here for later.'
                      : 'Ask a practical question or share something another ranger team could use.'}
              </p>
              <Button className="mt-4" onClick={() => setComposerOpen(true)}>
                <Plus /> {view === 'mine' ? 'Create a post' : 'Create the first post'}
              </Button>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <article key={post.id} className="group border-b py-5 first:pt-1">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5 h-9 w-9">
                      <AvatarFallback className="bg-sage/15 text-xs font-semibold text-forest">
                        {post.author.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <Link
                          href={`/community/members/${post.author.id}`}
                          className="font-semibold text-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {post.author.displayName}
                        </Link>
                        {post.author.organisationName && (
                          <span>{post.author.organisationName}</span>
                        )}
                        {post.author.isModerator && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            Moderator
                          </Badge>
                        )}
                        <span aria-hidden="true">·</span>
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
                        {post.status && post.status !== 'PUBLISHED' && (
                          <Badge
                            className={cn(
                              'font-normal',
                              post.status === 'REMOVED'
                                ? 'bg-rust/15 text-rust hover:bg-rust/15'
                                : 'bg-ochre/15 text-ochre hover:bg-ochre/15'
                            )}
                          >
                            {statusLabels[post.status]}
                          </Badge>
                        )}
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
                        <h2 className="text-lg font-semibold leading-snug group-hover:text-forest">
                          {post.title}
                        </h2>
                        <p className="mt-1 line-clamp-3 max-w-[72ch] whitespace-pre-line text-sm leading-6 text-muted-foreground">
                          {post.body}
                        </p>
                      </Link>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}
                        </span>
                        <span>{post.reactionCount} reactions</span>
                        {post.isFollowing && (
                          <span className="inline-flex items-center gap-1 text-forest">
                            <Bell className="h-3.5 w-3.5" /> Following
                          </span>
                        )}
                        {post.isBookmarked && (
                          <span className="inline-flex items-center gap-1 text-forest">
                            <Bookmark className="h-3.5 w-3.5" /> Saved
                          </span>
                        )}
                        {post.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => publishDraft(post.id)}
                            disabled={submitting}
                          >
                            <Send className="h-3.5 w-3.5" /> Publish
                          </Button>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-8 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </article>
              ))}
              {nextCursor && (
                <div className="pt-5 text-center">
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <Loader2 className="animate-spin" /> : null}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <MessagesSquare className="h-4 w-4 text-sage" /> Topic chats
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/community/chats">All chats</Link>
              </Button>
            </div>
            <div className="mt-2 divide-y">
              {rooms.slice(0, 5).map((room) => (
                <Link
                  key={room.id}
                  href={`/community/chats/${room.id}`}
                  className="block py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-medium hover:text-forest">{room.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {room.description}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3 w-3" /> {room.messageCount} messages
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-lg bg-forest px-4 py-4 text-cream">
            <UsersRound className="h-5 w-5 text-ochre" />
            <h2 className="mt-2 text-sm font-semibold">A shared space, not an emergency channel</h2>
            <p className="mt-1 text-xs leading-5 text-cream/75">
              Use your organisation&apos;s normal channels for urgent incidents and safety
              coordination.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
