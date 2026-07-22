import { NextResponse } from 'next/server';
import {
  sendCommunityDigests,
  sendCommunityImmediate,
  type CommunitySendResult,
} from '@/lib/community/email/send';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CRON_SECRET-protected Community email fan-out. Scheduled from vercel.json:
// ?mode=immediate|daily|weekly. Digest due-time and per-user preference/timezone
// checks live in the send path, so daily/weekly can safely run hourly and only
// deliver to profiles whose local digest hour matches. No-ops when Resend is
// unconfigured or COMMUNITY_EMAIL_ENABLED is off.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

type Mode = 'immediate' | 'daily' | 'weekly';
function parseMode(request: Request): Mode {
  const mode = new URL(request.url).searchParams.get('mode');
  if (mode === 'immediate' || mode === 'weekly') return mode;
  return 'daily';
}

async function run(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const mode = parseMode(request);
  const now = new Date();
  const outcome: CommunitySendResult =
    mode === 'immediate'
      ? await sendCommunityImmediate(now)
      : await sendCommunityDigests(mode, now);
  return NextResponse.json({ mode, ...outcome });
}

export const GET = run;
export const POST = run;
