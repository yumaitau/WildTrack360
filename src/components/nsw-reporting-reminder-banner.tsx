'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NSWReminderBannerData } from '@/lib/nsw-reminder-types';

type NSWReportingReminderBannerProps = {
  reminder: NSWReminderBannerData | null;
};

export function NSWReportingReminderBanner({ reminder }: NSWReportingReminderBannerProps) {
  const [visible, setVisible] = useState(Boolean(reminder));
  const [dismissing, setDismissing] = useState(false);

  if (!reminder || !visible) return null;

  async function dismiss() {
    if (!reminder) return;

    setDismissing(true);
    try {
      const response = await fetch('/api/admin-notification-dismissals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: reminder.kind,
          reminderKey: reminder.reminderKey,
          year: reminder.year,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setVisible(false);
    } catch (error) {
      console.error('Failed to dismiss NSW reminder:', error);
    } finally {
      setDismissing(false);
    }
  }

  const gapLabel =
    reminder.missingRequiredFieldCount === 1
      ? '1 animal is missing NSW-required fields'
      : `${reminder.missingRequiredFieldCount} animals are missing NSW-required fields`;

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-amber-950">{reminder.title}</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">{reminder.message}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-2 -mt-2 h-8 w-8 flex-shrink-0 p-0 text-amber-900 hover:bg-amber-100"
              onClick={dismiss}
              disabled={dismissing}
              aria-label="Dismiss NSW reporting reminder"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-amber-900 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p>{reminder.obligation}</p>
              <p className="mt-1 font-medium">
                {gapLabel} for {reminder.reportingPeriodLabel}.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Required fields: encounter type, fate, rescue location coordinates, and initial weight.
              </p>
            </div>
            <Button asChild size="sm" className="bg-amber-800 text-white hover:bg-amber-900">
              <Link href={reminder.ctaHref}>
                {reminder.ctaLabel}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
