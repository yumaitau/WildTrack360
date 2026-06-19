import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { logAudit } from '@/lib/audit';
import { exchangeCodeAndStore, consumeOAuthState } from '@/lib/square/oauth';
import { tenantBaseUrl, requestOrigin } from '@/lib/tenant-url';
import { route } from '@/lib/openapi/route';
import { squareOAuthCallbackContract } from '../../openapi';

export const GET = route(squareOAuthCallbackContract, async ({ request }) => {
  const settingsPath = '/admin/payments/settings';
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const sqError = url.searchParams.get('error');

  const fallback = `${requestOrigin(request)}${settingsPath}`;

  if (sqError || !code) return NextResponse.redirect(`${fallback}?error=${sqError ?? 'denied'}`);

  const orgId = await consumeOAuthState(url.searchParams.get('state'));
  if (!orgId) return NextResponse.redirect(`${fallback}?error=state`);

  const settings = `${await tenantBaseUrl(orgId)}${settingsPath}`;

  try {
    await exchangeCodeAndStore(orgId, code);
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
});
