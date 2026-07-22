'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  Flag,
  Loader2,
  Lock,
  LockOpen,
  MessageSquareReply,
  Pencil,
  Pin,
  PinOff,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { CommunityFeedback } from '@/components/community/community-feedback';
import { FieldStatus, validateCommunityText } from '@/components/community/field-status';
import { MentionTextarea } from '@/components/community/mention-textarea';
import { CommunityRichText, type MentionRef } from '@/components/community/rich-text';
import { useSetBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  parentId: string | null;
  body: string;
  status: 'PENDING' | 'PUBLISHED' | 'HELD';
  isOwner: boolean;
  author: {
    id: string;
    displayName: string;
    organisationName: string | null;
    isModerator: boolean;
  };
  mentions: MentionRef[];
  reactions: ReactionSummary[];
  createdAt: string;
}
interface ReactionSummary {
  type: string;
  count: number;
  reacted: boolean;
}
interface PostDetail {
  id: string;
  type: 'DISCUSSION' | 'QUESTION';
  title: string;
  body: string;
  status: 'PENDING' | 'PUBLISHED' | 'HELD' | 'REMOVED';
  isOwner: boolean;
  isModerator: boolean;
  isPinned: boolean;
  isLocked: boolean;
  author: {
    id: string;
    displayName: string;
    organisationName: string | null;
    isModerator: boolean;
  };
  category: { name: string };
  isFollowing: boolean;
  acceptedCommentId: string | null;
  mentions: MentionRef[];
  comments: Comment[];
  reactions: ReactionSummary[];
  createdAt: string;
}

export function CommunityPostDetail({ postId, canWrite }: { postId: string; canWrite: boolean }) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [replyMentions, setReplyMentions] = useState<MentionRef[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editMentions, setEditMentions] = useState<MentionRef[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [moderating, setModerating] = useState(false);
  useSetBreadcrumbLabel(post?.title);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function deletePost() {
    const ok = await confirm({
      title: 'Delete this post?',
      description: "This can't be undone. The post and its replies will be removed for everyone.",
      confirmLabel: 'Delete post',
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Post could not be deleted');
      toast.success('Post deleted');
      router.push('/community');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Post could not be deleted');
    }
  }

  function startEditPost() {
    if (!post) return;
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditMentions(post.mentions);
    setEditing(true);
  }

  async function savePostEdit() {
    const problem =
      validateCommunityText(editTitle, { min: 6, max: 160, field: 'Title' }) ??
      validateCommunityText(editBody, { min: 20, max: 10_000, field: 'Post' });
    if (problem) {
      toast.error(problem);
      return;
    }
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, body: editBody, mentions: editMentions }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Post could not be saved');
      toast.success('Edited — Wally is re-checking it.');
      setEditing(false);
      await load();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Post could not be saved');
    } finally {
      setSavingEdit(false);
    }
  }

  async function setPostFlag(flag: 'isPinned' | 'isLocked', value: boolean) {
    setModerating(true);
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: value }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Change could not be applied');
      }
      setPost((current) => (current ? { ...current, [flag]: value } : current));
      toast.success(
        flag === 'isPinned'
          ? value
            ? 'Post pinned'
            : 'Post unpinned'
          : value
            ? 'Post locked'
            : 'Post unlocked'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Change could not be applied');
    } finally {
      setModerating(false);
    }
  }

  async function deleteComment(commentId: string) {
    const ok = await confirm({
      title: 'Delete this reply?',
      description: "This can't be undone.",
      confirmLabel: 'Delete reply',
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Comment could not be deleted');
      toast.success('Comment deleted');
      await load();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Comment could not be deleted');
    }
  }

  async function editComment(commentId: string, nextBody: string, nextMentions: MentionRef[]) {
    const problem = validateCommunityText(nextBody, { min: 2, max: 4_000, field: 'Reply' });
    if (problem) {
      toast.error(problem);
      return false;
    }
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: nextBody, mentions: nextMentions }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Comment could not be saved');
      toast.success('Edited — Wally is re-checking it.');
      await load();
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Comment could not be saved');
      return false;
    }
  }

  const [appealing, setAppealing] = useState(false);
  async function appeal() {
    const explanation = window.prompt(
      'Tell the moderators why this should be restored (10+ characters):'
    );
    if (explanation === null) return;
    if (explanation.trim().length < 10) {
      toast.error('Please add a bit more detail (at least 10 characters).');
      return;
    }
    setAppealing(true);
    try {
      const response = await fetch('/api/community/moderation/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'POST',
          targetId: postId,
          explanation: explanation.trim(),
        }),
      });
      if (!response.ok) throw new Error('Appeal could not be submitted');
      toast.success('Appeal submitted — a moderator will review it.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Appeal could not be submitted');
    } finally {
      setAppealing(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Conversation could not be loaded');
      setPost(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Conversation could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const comments = useMemo(() => {
    if (!post) return [];
    const top = post.comments
      .filter((comment) => !comment.parentId)
      .map((comment) => ({
        ...comment,
        replies: post.comments.filter((reply) => reply.parentId === comment.id),
      }));
    // Float the accepted answer to the top of a question's replies.
    if (post.acceptedCommentId) {
      top.sort((a, b) =>
        a.id === post.acceptedCommentId ? -1 : b.id === post.acceptedCommentId ? 1 : 0
      );
    }
    return top;
  }, [post]);

  async function submitComment() {
    const problem = validateCommunityText(body, { min: 2, max: 4_000, field: 'Reply' });
    if (problem) {
      toast.error(problem);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          mentions: replyMentions,
          parentId: replyTo,
          clientMutationId: crypto.randomUUID(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Comment could not be submitted');
      toast.success(
        payload.status === 'PUBLISHED'
          ? 'Your comment is live.'
          : 'Your comment is waiting for review.'
      );
      setBody('');
      setReplyMentions([]);
      setReplyTo(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Comment could not be submitted');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFollow() {
    if (!post) return;
    const response = await fetch(`/api/community/posts/${post.id}/follow`, {
      method: post.isFollowing ? 'DELETE' : 'PUT',
    });
    if (response.ok) setPost({ ...post, isFollowing: !post.isFollowing });
  }

  async function acceptAnswer(commentId: string) {
    const response = await fetch(`/api/community/posts/${postId}/accept-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    if (response.ok) {
      setPost((current) => (current ? { ...current, acceptedCommentId: commentId } : current));
      toast.success('Answer accepted');
    }
  }

  async function report(targetType: 'POST' | 'COMMENT', targetId: string) {
    const response = await fetch('/api/community/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType,
        targetId,
        reason: 'OTHER',
        details: 'Please review this community content.',
      }),
    });
    if (response.ok) toast.success('Report sent privately to the moderation team');
    else toast.error('Report could not be sent');
  }

  async function react(
    targetType: 'POST' | 'COMMENT',
    targetId: string,
    type: string,
    reacted: boolean
  ) {
    const response = await fetch('/api/community/reactions', {
      method: reacted ? 'DELETE' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetId, type }),
    });
    if (!response.ok) toast.error('Reaction could not be updated');
    else await load();
  }

  if (loading)
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  if (!post)
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h1 className="text-xl font-semibold">Conversation unavailable</h1>
        <Button variant="link" asChild>
          <Link href="/community">Back to Community</Link>
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/community">
            <ArrowLeft /> Community
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <CommunityFeedback compact />
          {canWrite && (
            <Button variant="outline" size="sm" onClick={toggleFollow}>
              {post.isFollowing ? <BellOff /> : <Bell />}
              {post.isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}
          {post.isModerator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPostFlag('isPinned', !post.isPinned)}
              disabled={moderating}
            >
              {post.isPinned ? <PinOff /> : <Pin />}
              {post.isPinned ? 'Unpin' : 'Pin'}
            </Button>
          )}
          {post.isModerator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPostFlag('isLocked', !post.isLocked)}
              disabled={moderating}
            >
              {post.isLocked ? <LockOpen /> : <Lock />}
              {post.isLocked ? 'Unlock' : 'Lock'}
            </Button>
          )}
          {post.isOwner && post.status !== 'REMOVED' && !editing && (
            <Button variant="ghost" size="sm" onClick={startEditPost}>
              <Pencil /> Edit
            </Button>
          )}
          {(post.isOwner || post.isModerator) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={deletePost}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>
      {post.status === 'REMOVED' && post.isOwner && (
        <div className="rounded-lg border border-rust/30 bg-rust/5 px-4 py-3">
          <p className="text-sm font-medium text-rust">This post was removed by a moderator.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Only you can see it here. If you think this was a mistake, you can appeal for a human to
            take another look.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={appeal}
            disabled={appealing}
          >
            {appealing ? <Loader2 className="animate-spin" /> : null} Appeal this decision
          </Button>
        </div>
      )}
      <article className="rounded-xl border bg-background px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{post.category.name}</Badge>
          {post.type === 'QUESTION' && (
            <Badge className="bg-ochre/15 text-ochre hover:bg-ochre/15">Question</Badge>
          )}
          {post.isPinned && (
            <Badge className="gap-1 bg-forest/15 text-forest hover:bg-forest/15">
              <Pin className="h-3 w-3" /> Pinned
            </Badge>
          )}
          {post.isLocked && (
            <Badge className="gap-1 bg-rust/15 text-rust hover:bg-rust/15">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          )}
          {post.status !== 'PUBLISHED' && post.status !== 'REMOVED' && (
            <Badge className="bg-muted text-muted-foreground hover:bg-muted">
              {post.status === 'HELD' ? 'Awaiting human review' : 'Wally is checking'}
            </Badge>
          )}
        </div>
        {editing ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={160}
                aria-label="Title"
                aria-invalid={editTitle.trim().length > 0 && editTitle.trim().length < 6}
              />
              <FieldStatus value={editTitle} min={6} max={160} />
            </div>
            <div className="space-y-2">
              <MentionTextarea
                value={editBody}
                onValueChange={setEditBody}
                mentions={editMentions}
                onMentionsChange={setEditMentions}
                rows={8}
                maxLength={10000}
                aria-label="Post body"
                aria-invalid={editBody.trim().length > 0 && editBody.trim().length < 20}
              />
              <FieldStatus value={editBody} min={20} max={10_000} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Editing re-runs Wally&apos;s check.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={savingEdit}
                >
                  <X /> Cancel
                </Button>
                <Button size="sm" onClick={savePostEdit} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="animate-spin" /> : <Send />}
                  {savingEdit ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold leading-tight">{post.title}</h1>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {post.author.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link
                href={`/community/members/${post.author.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {post.author.displayName}
              </Link>
              {post.author.organisationName && <span>{post.author.organisationName}</span>}
              <time>
                {new Date(post.createdAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
              </time>
            </div>
            <CommunityRichText
              text={post.body}
              mentions={post.mentions}
              className="mt-6 block whitespace-pre-wrap text-sm leading-7"
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <ReactionBar
                reactions={post.reactions}
                onReact={(type, reacted) => react('POST', post.id, type, reacted)}
              />
              <Button variant="ghost" size="sm" onClick={() => report('POST', post.id)}>
                <Flag /> Report
              </Button>
            </div>
          </>
        )}
      </article>

      <section aria-labelledby="community-comments" className="space-y-4">
        <h2 id="community-comments" className="text-lg font-semibold">
          {post.comments.length} {post.comments.length === 1 ? 'reply' : 'replies'}
        </h2>
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-3">
            <CommentRow
              comment={comment}
              accepted={post.acceptedCommentId === comment.id}
              onReply={
                post.isLocked && !post.isModerator ? undefined : () => setReplyTo(comment.id)
              }
              onAccept={
                (post.isOwner || post.isModerator) && post.type === 'QUESTION'
                  ? () => acceptAnswer(comment.id)
                  : undefined
              }
              onReport={() => report('COMMENT', comment.id)}
              onReact={(type, reacted) => react('COMMENT', comment.id, type, reacted)}
              onDelete={
                comment.isOwner || post.isModerator ? () => deleteComment(comment.id) : undefined
              }
              onEdit={
                comment.isOwner
                  ? (nextBody, nextMentions) => editComment(comment.id, nextBody, nextMentions)
                  : undefined
              }
            />
            {comment.replies.map((reply) => (
              <div key={reply.id} className="ml-6 border-l pl-4 sm:ml-12">
                <CommentRow
                  comment={reply}
                  accepted={post.acceptedCommentId === reply.id}
                  onAccept={
                    (post.isOwner || post.isModerator) && post.type === 'QUESTION'
                      ? () => acceptAnswer(reply.id)
                      : undefined
                  }
                  onReport={() => report('COMMENT', reply.id)}
                  onReact={(type, reacted) => react('COMMENT', reply.id, type, reacted)}
                  onDelete={
                    reply.isOwner || post.isModerator ? () => deleteComment(reply.id) : undefined
                  }
                  onEdit={
                    reply.isOwner
                      ? (nextBody, nextMentions) => editComment(reply.id, nextBody, nextMentions)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        ))}
        {post.isLocked && !post.isModerator && post.status === 'PUBLISHED' && (
          <div className="flex items-center gap-2 rounded-lg border border-rust/30 bg-rust/5 px-4 py-3 text-sm text-rust">
            <Lock className="h-4 w-4 shrink-0" /> This conversation is locked. New replies are
            turned off.
          </div>
        )}
        {canWrite && post.status === 'PUBLISHED' && (!post.isLocked || post.isModerator) && (
          <div className="rounded-lg border bg-background p-4">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1">
                  <MessageSquareReply className="h-3.5 w-3.5" /> Replying to a comment
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="font-medium text-forest"
                >
                  Cancel
                </button>
              </div>
            )}
            <MentionTextarea
              value={body}
              onValueChange={setBody}
              mentions={replyMentions}
              onMentionsChange={setReplyMentions}
              rows={4}
              maxLength={4000}
              placeholder="Add a useful reply… type @ to mention someone"
              aria-label="Comment"
              aria-invalid={body.trim().length > 0 && body.trim().length < 2}
            />
            <FieldStatus value={body} min={2} max={4_000} className="mt-2" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Wally checks replies before publication.
              </p>
              <Button onClick={submitComment} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                {submitting ? 'Checking…' : 'Reply'}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CommentRow({
  comment,
  accepted,
  onReply,
  onAccept,
  onReport,
  onReact,
  onDelete,
  onEdit,
}: {
  comment: Comment;
  accepted: boolean;
  onReply?: () => void;
  onAccept?: () => void;
  onReport: () => void;
  onReact: (type: string, reacted: boolean) => void;
  onDelete?: () => void;
  onEdit?: (body: string, mentions: MentionRef[]) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [draftMentions, setDraftMentions] = useState<MentionRef[]>(comment.mentions);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(comment.body);
    setDraftMentions(comment.mentions);
    setEditing(true);
  }

  async function save() {
    if (!onEdit) return;
    setSaving(true);
    const ok = await onEdit(draft, draftMentions);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <article
      className={cn('rounded-lg border bg-background p-4', accepted && 'border-sage/50 bg-sage/5')}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px]">
            {comment.author.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Link
          href={`/community/members/${comment.author.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {comment.author.displayName}
        </Link>
        {comment.author.organisationName && <span>{comment.author.organisationName}</span>}
        <time>
          {new Date(comment.createdAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
        </time>
        {accepted && (
          <Badge className="ml-auto gap-1 bg-sage/15 text-sage hover:bg-sage/15">
            <CheckCircle2 className="h-3 w-3" /> Accepted answer
          </Badge>
        )}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <MentionTextarea
            value={draft}
            onValueChange={setDraft}
            mentions={draftMentions}
            onMentionsChange={setDraftMentions}
            rows={4}
            maxLength={4000}
            aria-label="Edit reply"
            aria-invalid={draft.trim().length > 0 && draft.trim().length < 2}
          />
          <FieldStatus value={draft} min={2} max={4_000} />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
              disabled={saving}
            >
              <X /> Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Send />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <CommunityRichText
            text={comment.body}
            mentions={comment.mentions}
            className="mt-3 block whitespace-pre-wrap text-sm leading-6"
          />
          {comment.status !== 'PUBLISHED' && (
            <p className="mt-2 text-xs font-medium text-ochre">
              {comment.status === 'HELD' ? 'Awaiting human review' : 'Wally is checking this reply'}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <ReactionBar reactions={comment.reactions} onReact={onReact} />{' '}
            <div className="flex flex-wrap justify-end gap-1">
              {onReply && (
                <Button variant="ghost" size="sm" onClick={onReply}>
                  Reply
                </Button>
              )}
              {onAccept && !accepted && (
                <Button variant="ghost" size="sm" onClick={onAccept}>
                  <CheckCircle2 /> Accept answer
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  <Pencil /> Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onReport}>
                <Flag /> Report
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

const reactionLabels = {
  HELPFUL: 'Helpful',
  THANKS: 'Thanks',
  SUPPORT: 'Support',
  CELEBRATE: 'Celebrate',
} as const;

function ReactionBar({
  reactions,
  onReact,
}: {
  reactions: ReactionSummary[];
  onReact: (type: string, reacted: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Reactions">
      {Object.entries(reactionLabels).map(([type, label]) => {
        const current = reactions.find((reaction) => reaction.type === type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={current?.reacted ?? false}
            onClick={() => onReact(type, current?.reacted ?? false)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              current?.reacted
                ? 'border-sage bg-sage/15 text-forest'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
            {current?.count ? ` ${current.count}` : ''}
          </button>
        );
      })}
    </div>
  );
}
