import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { dismissNSWReminder } from '@/lib/nsw-reminders';
import type { NSWReminderKey } from '@/lib/nsw-reminder-types';
import { route } from '@/lib/openapi/route';
import { dismissNotificationContract } from './openapi';

const NSW_REMINDER_KEYS = new Set<NSWReminderKey>([
  'eofy-30-day',
  'eofy-14-day',
  'submission-30-day',
  'submission-14-day',
]);

export const POST = route(dismissNotificationContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (
    !body ||
    (body as Record<string, unknown>).kind !== 'nsw-reminder' ||
    !NSW_REMINDER_KEYS.has((body as Record<string, unknown>).reminderKey as NSWReminderKey) ||
    !Number.isInteger((body as Record<string, unknown>).year)
  ) {
    return NextResponse.json({ error: 'Invalid dismissal payload' }, { status: 400 });
  }

  const b = body as { kind: string; reminderKey: NSWReminderKey; year: number };
  await dismissNSWReminder({ userId, orgId, reminderKey: b.reminderKey, year: b.year });
  return { data: { ok: true } };
});
