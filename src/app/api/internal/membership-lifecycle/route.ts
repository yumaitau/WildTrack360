import { NextResponse } from 'next/server';
import { runMembershipLifecycle } from '@/lib/membership-lifecycle';
import { route } from '@/lib/openapi/route';
import { membershipLifecycleGetContract, membershipLifecyclePostContract } from '../openapi';

export const dynamic = 'force-dynamic';

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export const GET = route(membershipLifecycleGetContract, async ({ request }) => {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runMembershipLifecycle();
  return { data: result };
});

export const POST = route(membershipLifecyclePostContract, async ({ request }) => {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runMembershipLifecycle();
  return { data: result };
});
