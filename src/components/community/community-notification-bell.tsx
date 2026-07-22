'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AtSign,
  Bell,
  CheckCheck,
  CircleCheckBig,
  Flag,
  Gavel,
  Megaphone,
  MessageSquare,
  Scale,
  Smile,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type CommunityNotificationType =
  | 'REPLY'
  | 'MENTION'
  | 'ACCEPTED_ANSWER'
  | 'REACTION_SUMMARY'
  | 'FOLLOWED_POST_ACTIVITY'
  | 'MODERATION_DECISION'
  | 'REPORT_OUTCOME'
  | 'APPEAL_OUTCOME'
  | 'BETA_ANNOUNCEMENT';

type CommunityTargetType = 'POST' | 'COMMENT' | 'CHAT_MESSAGE';

interface CommunityNotification {
  id: string;
  type: CommunityNotificationType;
  title: string;
  targetType: CommunityTargetType | null;
  targetId: string | null;
  actor: { displayName: string } | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  items: CommunityNotification[];
  nextCursor: string | null;
}

const POLL_INTERVAL_MS = 60_000;

const TYPE_ICON: Record<CommunityNotificationType, LucideIcon> = {
  REPLY: MessageSquare,
  MENTION: AtSign,
  ACCEPTED_ANSWER: CircleCheckBig,
  REACTION_SUMMARY: Smile,
  FOLLOWED_POST_ACTIVITY: Bell,
  MODERATION_DECISION: Gavel,
  REPORT_OUTCOME: Flag,
  APPEAL_OUTCOME: Scale,
  BETA_ANNOUNCEMENT: Sparkles,
};

const TYPE_TINT: Record<CommunityNotificationType, string> = {
  REPLY: 'text-forest',
  MENTION: 'text-forest',
  ACCEPTED_ANSWER: 'text-forest',
  REACTION_SUMMARY: 'text-ochre',
  FOLLOWED_POST_ACTIVITY: 'text-forest',
  MODERATION_DECISION: 'text-rust',
  REPORT_OUTCOME: 'text-rust',
  APPEAL_OUTCOME: 'text-ochre',
  BETA_ANNOUNCEMENT: 'text-ochre',
};

function notificationHref(item: CommunityNotification): string | null {
  if (!item.targetId) return null;
  switch (item.targetType) {
    case 'POST':
    case 'COMMENT':
      return `/community/posts/${item.targetId}`;
    case 'CHAT_MESSAGE':
      // Chat mention notifications carry the room id, so link to the room.
      return `/community/chats/${item.targetId}`;
    default:
      return null;
  }
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function CommunityNotificationBell() {
  const [items, setItems] = useState<CommunityNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const mountedRef = useRef(true);

  const unreadCount = useMemo(() => items.filter((item) => item.readAt === null).length, [items]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/community/notifications', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsResponse;
      if (!mountedRef.current || !Array.isArray(data.items)) return;
      setItems(data.items);
    } catch {
      // Fail quietly — a flaky fetch should never crash the header.
    } finally {
      if (mountedRef.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const timer = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  const patchRead = useCallback(async (body: { ids?: string[]; markAllRead?: boolean }) => {
    try {
      const res = await fetch('/api/community/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    const previous = items;
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    const ok = await patchRead({ markAllRead: true });
    if (!mountedRef.current) return;
    if (!ok) {
      setItems(previous);
    } else {
      void load();
    }
    setMarkingAll(false);
  }, [items, load, markingAll, patchRead, unreadCount]);

  const markOneRead = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target || target.readAt) return;
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: now } : item)));
      void patchRead({ ids: [id] });
    },
    [items, patchRead]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Community notifications, ${unreadCount} unread`
              : 'Community notifications'
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div>
            <p className="text-sm font-medium">Community</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>

        {!loaded ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="py-1">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type] ?? Megaphone;
                const tint = TYPE_TINT[item.type] ?? 'text-forest';
                const href = notificationHref(item);
                const unread = item.readAt === null;

                const inner = (
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted',
                        tint
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'line-clamp-2 text-sm leading-snug',
                          unread ? 'font-medium' : 'font-normal'
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {item.actor?.displayName ? `${item.actor.displayName} · ` : ''}
                        {relativeTime(item.createdAt)}
                      </p>
                    </div>
                    {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ochre" />}
                  </div>
                );

                const rowClass = cn(
                  'block border-b px-3 py-2.5 text-left last:border-b-0',
                  unread && 'bg-ochre/10',
                  href && 'transition-colors hover:bg-muted/60'
                );

                if (href) {
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={rowClass}
                      onClick={() => {
                        markOneRead(item.id);
                        setOpen(false);
                      }}
                    >
                      {inner}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(rowClass, 'w-full hover:bg-muted/60')}
                    onClick={() => markOneRead(item.id)}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
