import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCommunitySession } from '@/lib/community/access';
import {
  sendCommunityDigests,
  sendCommunityImmediate,
  type CommunitySendResult,
} from '@/lib/community/email/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidCronSecret(secret: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!secret || !expected) return false;
  if (secret.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
}

type SyncMode = 'daily' | 'weekly' | 'immediate';

function parseMode(request: NextRequest): SyncMode {
  const mode = request.nextUrl.searchParams.get('mode');
  if (mode === 'weekly' || mode === 'immediate') return mode;
  return 'daily';
}

// Scheduled community email fan-out. Auth: x-cron-secret (Vercel cron / internal
// caller) OR an authenticated platform Community admin so a manual run works.
// ?mode=daily|weekly|immediate.
export async function POST(request: NextRequest) {
  if (!isValidCronSecret(request.headers.get('x-cron-secret'))) {
    const session = await getCommunitySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const mode = parseMode(request);
  const now = new Date();

  let outcome: CommunitySendResult;
  if (mode === 'immediate') {
    outcome = await sendCommunityImmediate(now);
  } else {
    outcome = await sendCommunityDigests(mode, now);
  }

  console.log(
    `[community-email] mode=${mode} ran=${outcome.ran} sent=${outcome.sent} skipped=${outcome.skipped} suppressed=${outcome.suppressed} failed=${outcome.failed}`
  );

  return NextResponse.json({
    mode,
    ran: outcome.ran,
    sent: outcome.sent,
    skipped: outcome.skipped,
    suppressed: outcome.suppressed,
    failed: outcome.failed,
  });
}
