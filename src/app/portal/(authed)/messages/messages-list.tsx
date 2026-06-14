'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PortalMessage {
  id: string;
  subject: string;
  body: string;
  sentByName: string | null;
  readAt: string | null;
  createdAt: string;
}

export function MessagesList({ messages }: { messages: PortalMessage[] }) {
  const [items, setItems] = useState(messages);
  const marked = useRef(false);

  // On first view, mark any unread messages as read so the inbox badge clears.
  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    const unread = messages.filter((m) => !m.readAt);
    if (unread.length === 0) return;
    Promise.allSettled(
      unread.map((m) =>
        fetch(`/api/portal/messages/${m.id}/read`, { method: 'POST' })
      )
    ).then(() => {
      setItems((prev) => prev.map((m) => (m.readAt ? m : { ...m, readAt: new Date().toISOString() })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const wasUnread = !messages.find((x) => x.id === m.id)?.readAt;
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{m.body}</p>
              <p className="text-xs text-muted-foreground pt-1">
                {m.sentByName ? `${m.sentByName} · ` : ''}
                {new Date(m.createdAt).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
