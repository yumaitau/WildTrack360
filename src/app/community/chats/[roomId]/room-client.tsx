'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Lock, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CommunityFeedback } from '@/components/community/community-feedback';
import { FieldStatus, validateCommunityText } from '@/components/community/field-status';
import { MentionTextarea } from '@/components/community/mention-textarea';
import { CommunityRichText, type MentionRef } from '@/components/community/rich-text';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Payload {
  room: {
    id: string;
    name: string;
    description: string | null;
    isReadOnly: boolean;
    slowModeSeconds: number;
  };
  viewerIsModerator: boolean;
  items: {
    id: string;
    body: string;
    status: 'PUBLISHED' | 'PENDING' | 'HELD';
    isOwner: boolean;
    author: { displayName: string; organisationName: string | null };
    mentions: MentionRef[];
    createdAt: string;
  }[];
}

export function CommunityChatRoom({ roomId, canWrite }: { roomId: string; canWrite: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<MentionRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const latestId = useRef<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(
    async (quiet = false) => {
      try {
        const response = await fetch(`/api/community/chats/${roomId}/messages`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Chat could not be loaded');
        const payload: Payload = await response.json();
        setData(payload);
        const nextLatest = payload.items.at(-1)?.id ?? null;
        if (quiet && latestId.current && nextLatest && nextLatest !== latestId.current) {
          // A polite update affordance without stealing focus or moving the user.
          toast.info('New messages are available');
        }
        latestId.current = nextLatest;
      } catch (error) {
        if (!quiet)
          toast.error(error instanceof Error ? error.message : 'Chat could not be loaded');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [roomId]
  );

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function send() {
    const problem = validateCommunityText(body, { min: 1, max: 2_000, field: 'Message' });
    if (problem) {
      toast.error(problem);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/community/chats/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, mentions, clientMutationId: crypto.randomUUID() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Message could not be sent');
      setBody('');
      setMentions([]);
      toast.success(
        payload.status === 'PUBLISHED' ? 'Message posted' : 'Message is waiting for review'
      );
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Message could not be sent');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteMessage(id: string) {
    const ok = await confirm({
      title: 'Delete this message?',
      description: "This can't be undone.",
      confirmLabel: 'Delete message',
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/community/chats/${roomId}/messages/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Message could not be deleted');
      toast.success('Message deleted');
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Message could not be deleted');
    }
  }

  if (loading)
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[34rem] w-full" />
      </div>
    );
  if (!data) return null;

  return (
    <div
      className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-xl border bg-background"
      style={{ height: 'calc(100dvh - 9rem)' }}
    >
      {dialog}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/community/chats" aria-label="Back to chats">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-semibold">{data.room.name}</h1>
              {data.room.isReadOnly && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" /> Read-only
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{data.room.description}</p>
          </div>
        </div>
        <CommunityFeedback compact />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        <div className="space-y-5">
          {data.items.map((message) => (
            <article key={message.id} className="group flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {message.author.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold">{message.author.displayName}</span>
                  {message.author.organisationName && (
                    <span className="text-muted-foreground">{message.author.organisationName}</span>
                  )}
                  <time className="text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString('en-AU', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                <CommunityRichText
                  text={message.body}
                  mentions={message.mentions}
                  className="mt-1 block whitespace-pre-wrap text-sm leading-6"
                />
                {message.status !== 'PUBLISHED' && (
                  <p className="mt-1 text-xs font-medium text-ochre">
                    {message.status === 'HELD'
                      ? 'Awaiting human review'
                      : 'Wally is checking this message'}
                  </p>
                )}
              </div>
              {(message.isOwner || data.viewerIsModerator) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 self-start text-destructive opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deleteMessage(message.id)}
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </article>
          ))}
          {data.items.length === 0 && (
            <div className="py-20 text-center">
              <h2 className="font-semibold">Start this room&apos;s first conversation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Share a useful update or ask a quick question.
              </p>
            </div>
          )}
        </div>
      </div>
      {canWrite && !data.room.isReadOnly ? (
        <div className="border-t p-3 sm:p-4">
          <MentionTextarea
            value={body}
            onValueChange={setBody}
            mentions={mentions}
            onMentionsChange={setMentions}
            rows={2}
            maxLength={2000}
            placeholder="Message the room… type @ to mention someone"
            aria-label="Chat message"
          />
          <FieldStatus value={body} max={2_000} className="mt-1.5" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Wally checks messages before publication
              {data.room.slowModeSeconds ? ` · ${data.room.slowModeSeconds}s slow mode` : ''}.
            </p>
            <Button onClick={send} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              {submitting ? 'Checking…' : 'Send'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          <Lock className="mr-1 inline h-4 w-4" /> This room is read-only.
        </div>
      )}
    </div>
  );
}
