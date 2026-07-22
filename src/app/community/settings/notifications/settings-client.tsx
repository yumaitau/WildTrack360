'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Loader2, Mail, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

interface Preference {
  emailEnabled: boolean;
  frequency: 'OFF' | 'IMMEDIATE' | 'DAILY' | 'WEEKLY';
  timezone: string;
  digestDay: number;
  digestHour: number;
  notifyReplies: boolean;
  notifyMentions: boolean;
  notifyAcceptedAnswers: boolean;
  notifyFollowedPosts: boolean;
  notifyCategories: boolean;
  notifyChats: boolean;
  notifyReactionSummaries: boolean;
  notifyBetaAnnouncements: boolean;
}

const defaults = (timezone = 'Australia/Darwin'): Preference => ({
  emailEnabled: false,
  frequency: 'OFF',
  timezone,
  digestDay: 1,
  digestHour: 8,
  notifyReplies: true,
  notifyMentions: true,
  notifyAcceptedAnswers: true,
  notifyFollowedPosts: true,
  notifyCategories: false,
  notifyChats: false,
  notifyReactionSummaries: false,
  notifyBetaAnnouncements: true,
});

const events: [keyof Preference, string, string][] = [
  [
    'notifyReplies',
    'Replies to my posts and comments',
    'In-app and optional email updates for direct replies.',
  ],
  ['notifyMentions', 'Mentions', 'When another participant mentions you.'],
  ['notifyAcceptedAnswers', 'Accepted answers', 'When your answer is accepted.'],
  [
    'notifyFollowedPosts',
    'Followed discussions',
    'New useful activity in conversations you follow.',
  ],
  ['notifyCategories', 'Category updates', 'A digest of selected community categories.'],
  ['notifyChats', 'Chat mentions', 'Mentions only, never every ordinary chat message.'],
  [
    'notifyReactionSummaries',
    'Reaction summaries',
    'Batched summaries, never one email per reaction.',
  ],
  [
    'notifyBetaAnnouncements',
    'Beta announcements',
    'Changes and learning from the WildTrack360 team.',
  ],
];

export function CommunityNotificationSettings({ canWrite }: { canWrite: boolean }) {
  const [preference, setPreference] = useState<Preference | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void fetch('/api/community/notification-preferences', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setPreference)
      .catch(() => toast.error('Notification settings could not be loaded'));
  }, []);

  async function save() {
    if (!preference) return;
    setSaving(true);
    try {
      const response = await fetch('/api/community/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Settings could not be saved');
      toast.success('Community notification settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settings could not be saved');
    } finally {
      setSaving(false);
    }
  }

  if (!preference)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3">
          <Link href="/community">
            <ArrowLeft /> Community
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Community notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what reaches you. In-app activity and optional email are independent.
        </p>
      </div>
      <section className="rounded-xl border bg-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-sage/15 p-2 text-sage">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Optional community email</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Off by default for the beta. Essential moderation, appeal and safety service messages
              are separate.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preference.emailEnabled}
            disabled={!canWrite}
            onClick={() =>
              setPreference({
                ...preference,
                emailEnabled: !preference.emailEnabled,
                frequency: preference.emailEnabled
                  ? 'OFF'
                  : preference.frequency === 'OFF'
                    ? 'DAILY'
                    : preference.frequency,
              })
            }
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              preference.emailEnabled ? 'bg-forest' : 'bg-muted-foreground/30'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                preference.emailEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['OFF', 'IMMEDIATE', 'DAILY', 'WEEKLY'] as const).map((frequency) => (
            <button
              key={frequency}
              type="button"
              disabled={!canWrite}
              onClick={() =>
                setPreference({ ...preference, frequency, emailEnabled: frequency !== 'OFF' })
              }
              className={cn(
                'rounded-md border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                preference.frequency === frequency
                  ? 'border-forest bg-forest text-cream'
                  : 'bg-background hover:bg-muted'
              )}
            >
              {frequency === 'OFF'
                ? 'Off'
                : frequency === 'IMMEDIATE'
                  ? 'Immediate'
                  : frequency === 'DAILY'
                    ? 'Daily digest'
                    : 'Weekly digest'}
            </button>
          ))}
        </div>
        {preference.frequency === 'DAILY' || preference.frequency === 'WEEKLY' ? (
          <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Timezone</Label>
              <Select
                value={preference.timezone}
                onValueChange={(timezone) => setPreference({ ...preference, timezone })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'Australia/Darwin',
                    'Australia/Brisbane',
                    'Australia/Sydney',
                    'Australia/Adelaide',
                    'Australia/Perth',
                    'Australia/Hobart',
                  ].map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery hour</Label>
              <Select
                value={String(preference.digestHour)}
                onValueChange={(value) =>
                  setPreference({ ...preference, digestHour: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {new Intl.DateTimeFormat('en-AU', { hour: 'numeric' }).format(
                        new Date(2026, 0, 1, hour)
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </section>
      <section className="rounded-xl border bg-background">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell className="h-4 w-4 text-sage" /> Activity choices
          </h2>
        </div>
        <div className="divide-y">
          {events.map(([key, label, description]) => (
            <label key={key} className="flex items-start gap-4 px-5 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
              </span>
              <input
                type="checkbox"
                disabled={!canWrite}
                checked={Boolean(preference[key])}
                onChange={(event) => setPreference({ ...preference, [key]: event.target.checked })}
                className="mt-1 h-4 w-4 accent-forest"
              />
            </label>
          ))}
        </div>
      </section>
      <div className="rounded-lg bg-sage/10 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mr-2 inline h-4 w-4 text-sage" /> Emails use safe titles, counts and
        authenticated links. Chat bodies, removed content and sensitive locations are not copied
        into email.
      </div>
      {canWrite && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPreference(defaults(preference.timezone))}>
            <RotateCcw /> Reset defaults
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      )}
    </div>
  );
}
