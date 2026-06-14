'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface PortalMessage {
  id: string;
  subject: string;
  body: string;
  sentByName: string | null;
  readAt: string | null;
  createdAt: string;
}

export function MessagesList({
  messages,
  nextCursor,
}: {
  messages: PortalMessage[];
  nextCursor: string | null;
}) {
  const [items, setItems] = useState(messages);
  const [cursor, setCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const marked = useRef(false);

  // On first view, mark any unread messages as read so the inbox badge clears.
  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    const unread = messages.filter((m) => !m.readAt);
    if (unread.length === 0) return;
    Promise.all(
      unread.map(async (m) => {
        const res = await fetch(`/api/portal/messages/${m.id}/read`, { method: 'POST' }).catch(
          () => null
        );
        return res?.ok ? m.id : null;
      })
    ).then((ids) => {
      const okIds = new Set(ids.filter((id): id is string => Boolean(id)));
      const now = new Date().toISOString();
      setItems((prev) => prev.map((m) => (okIds.has(m.id) ? { ...m, readAt: now } : m)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/portal/messages?cursor=${encodeURIComponent(cursor)}&limit=50`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = (await res.json()) as { messages: PortalMessage[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.messages]);
      setCursor(data.nextCursor);
    } catch {
      // Keep the existing page of messages visible.
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          You have no messages yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((m) => {
        const wasUnread = !m.readAt;
        return (
          <Card key={m.id} className={wasUnread ? 'border-primary/40' : undefined}>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{m.subject}</div>
                {wasUnread && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {m.body}
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                {m.sentByName ? `${m.sentByName} · ` : ''}
                {new Date(m.createdAt).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </CardContent>
          </Card>
        );
      })}
      {cursor && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
