'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Circle, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Status {
  squareConnected: boolean;
  hasTiers: boolean;
  receiptsConfigured: boolean;
  joinPagePublic: boolean;
  hasMembers: boolean;
  hasNewsPost: boolean;
}

interface Step {
  key: keyof Status;
  label: string;
  description: string;
  href: string;
}

const STEPS: Step[] = [
  {
    key: 'squareConnected',
    label: 'Connect Square for payments',
    description: 'Accept membership fees and donations.',
    href: '/admin/payments/settings',
  },
  {
    key: 'receiptsConfigured',
    label: 'Add your ABN for tax receipts',
    description: 'Required on receipts and annual statements.',
    href: '/admin?tab=org-settings',
  },
  {
    key: 'hasTiers',
    label: 'Create membership tiers',
    description: 'Add at least one tier so members can join.',
    href: '/admin/members?tab=tiers',
  },
  {
    key: 'joinPagePublic',
    label: 'Set your public join page',
    description: 'Give your org a public subdomain to share.',
    href: '/admin?tab=org-settings',
  },
  {
    key: 'hasMembers',
    label: 'Add or import your members',
    description: 'Import a CSV or add your first member.',
    href: '/admin/members',
  },
  {
    key: 'hasNewsPost',
    label: 'Publish a welcome update',
    description: 'Post news that members see and get emailed.',
    href: '/admin/news',
  },
];

const DISMISS_KEY = 'wt360-onboarding-dismissed';

export function OnboardingChecklist() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    fetch('/api/admin/onboarding')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  if (!status || dismissed) return null;

  const done = STEPS.filter((s) => status[s.key]).length;
  const pct = Math.round((done / STEPS.length) * 100);
  if (done === STEPS.length) return null; // fully set up — hide

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Set up your membership program</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {done} of {STEPS.length} done — finish these to start accepting members.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={pct} className="h-2" />
        <div className="divide-y">
          {STEPS.map((s) => {
            const complete = status[s.key];
            return (
              <Link
                key={s.key}
                href={s.href}
                className="flex items-center gap-3 py-2.5 group"
              >
                {complete ? (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 p-1">
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="text-muted-foreground p-1">
                    <Circle className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${complete ? 'text-muted-foreground line-through' : ''}`}>
                    {s.label}
                  </div>
                  {!complete && (
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  )}
                </div>
                {!complete && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
