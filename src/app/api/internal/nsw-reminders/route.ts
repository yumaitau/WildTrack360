import { NextResponse } from 'next/server';
import { sendDueNSWReminderNotifications } from '@/lib/nsw-reminders';
import { route } from '@/lib/openapi/route';
import { nswRemindersGetContract, nswRemindersPostContract } from '../openapi';

export const dynamic = 'force-dynamic';

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export const GET = route(nswRemindersGetContract, async ({ request }) => {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendDueNSWReminderNotifications();
  return { data: result };
});

export const POST = route(nswRemindersPostContract, async ({ request }) => {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await sendDueNSWReminderNotifications();
  return { data: result };
});
