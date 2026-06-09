import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logAudit } from '@/lib/audit';
import { exchangeCodeAndStore, verifyOAuthState } from '@/lib/square/oauth';
import { resolveBaseUrl } from '@/lib/square/config';

// Square redirects here (a single canonical host) after the seller authorises.
// The org is recovered from the signed `state` — minted by the auth-gated
// authorize route — so this works regardless of which org subdomain started the
// flow and needs no Clerk session here. Exchange the code, persist the
// connection, bounce back to the payments settings page.
export async function GET(request: Request) {
  const settings = `${resolveBaseUrl()}/admin/payments/settings`;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const sqError = url.searchParams.get('error');

  if (sqError || !code) return NextResponse.redirect(`${settings}?error=${sqError ?? 'denied'}`);

  const orgId = verifyOAuthState(url.searchParams.get('state'));
  if (!orgId) return NextResponse.redirect(`${settings}?error=state`);

  try {
    await exchangeCodeAndStore(orgId, code);
    // userId is best-effort (session may not be present on this host).
    const { userId } = await auth();
    logAudit({
      userId: userId ?? 'square-oauth',
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
