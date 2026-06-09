import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requirePermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { exchangeCodeAndStore } from '@/lib/square/oauth';
import { resolveBaseUrl } from '@/lib/square/config';

// Square redirects here after the seller authorises (or declines). We verify
// the session org matches the `state`, exchange the code for tokens, persist
// the connection, then bounce back to the payments settings page.
export async function GET(request: Request) {
  const base = resolveBaseUrl();
  const settings = `${base}/admin/payments/settings`;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.redirect(`${settings}?error=auth`);

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const sqError = url.searchParams.get('error');

  if (sqError || !code) return NextResponse.redirect(`${settings}?error=${sqError ?? 'denied'}`);
  if (state !== orgId) return NextResponse.redirect(`${settings}?error=state`);

  try {
    await requirePermission(userId, orgId, 'settings:manage');
    await exchangeCodeAndStore(orgId, code);
    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'SquareConnection',
      entityId: orgId,
      metadata: { action: 'connect' },
    });
    return NextResponse.redirect(`${settings}?ok=1`);
  } catch (error) {
    console.error('Square OAuth callback failed:', error);
    return NextResponse.redirect(`${settings}?error=exchange`);
  }
}
