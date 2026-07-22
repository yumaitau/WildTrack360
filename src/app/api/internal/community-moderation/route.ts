import { NextResponse } from 'next/server';
import { processQueuedCommunityModerationJobs } from '@/lib/community/moderation/jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CRON_SECRET-protected drain for the durable Community moderation queue. Runs
// every five minutes (vercel.json). Reclaims crashed RUNNING jobs after their
// lease expires, retries provider failures with backoff, and routes exhausted /
// unconfigured jobs to human review — content is never stranded invisible in
// PENDING. Self-hosters without Bedrock get a fully usable human-review path.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? '25') || 25;
  const processed = await processQueuedCommunityModerationJobs(Math.min(Math.max(limit, 1), 100));
  return NextResponse.json({ processed });
}

export const GET = run;
export const POST = run;
