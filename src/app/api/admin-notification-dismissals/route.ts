import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dismissNSWReminder } from '@/lib/nsw-reminders';
import type { NSWReminderKey } from '@/lib/nsw-reminder-types';

const NSW_REMINDER_KEYS = new Set<NSWReminderKey>([
  'eofy-30-day',
  'eofy-14-day',
  'submission-30-day',
  'submission-14-day',
]);

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    body.kind !== 'nsw-reminder' ||
    !NSW_REMINDER_KEYS.has(body.reminderKey) ||
    !Number.isInteger(body.year)
  ) {
    return NextResponse.json({ error: 'Invalid dismissal payload' }, { status: 400 });
  }

  await dismissNSWReminder({
    userId,
    orgId,
    reminderKey: body.reminderKey,
    year: body.year,
  });

  return NextResponse.json({ ok: true });
}
