import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logAudit } from '@/lib/audit';
import { exchangeCodeAndStore, consumeOAuthState } from '@/lib/square/oauth';
import { tenantBaseUrl, requestOrigin } from '@/lib/tenant-url';

// Square redirects here (a single canonical host, the registered redirect URL)
// after the seller authorises. The org is recovered from the signed `state` —
// minted by the auth-gated authorize route — so this works regardless of which
// org subdomain started the flow and needs no Clerk session here. Exchange the
// code, persist the connection, then bounce back to the org's OWN tenant
// subdomain (derived from the org, never a baked-in site URL).
export async function GET(request: Request) {
  const settingsPath = '/admin/payments/settings';
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const sqError = url.searchParams.get('error');

  // Before the state is consumed we have no org context — bounce back to the
  // host Square actually called (the registered redirect URL), not localhost.
  const fallback = `${requestOrigin(request)}${settingsPath}`;

  if (sqError || !code) return NextResponse.redirect(`${fallback}?error=${sqError ?? 'denied'}`);

  const orgId = await consumeOAuthState(url.searchParams.get('state'));
  if (!orgId) return NextResponse.redirect(`${fallback}?error=state`);

  const settings = `${await tenantBaseUrl(orgId)}${settingsPath}`;

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
