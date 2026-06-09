'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../prisma';
import { encryptSecret, decryptSecret } from '../crypto';
import {
  getApplicationId,
  getApplicationSecret,
  getSquareClient,
  squareBaseUrl,
  SQUARE_VERSION,
} from './client';

// Scopes requested when an org connects their Square account. The app fee
// requires PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS; MERCHANT_PROFILE_READ lets us
// read the seller's location id.
export const SQUARE_OAUTH_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_WRITE',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS',
  'CUSTOMERS_WRITE',
  'CUSTOMERS_READ',
];

// Refresh the access token once it's within this window of expiry. Square
// access tokens last 30 days; refresh tokens (code flow) don't expire.
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

function stateSecret(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY is not configured');
  return key;
}

// Sign the org id into the OAuth `state` so the callback can recover it WITHOUT
// a Clerk session — the callback lives on one canonical host, but the admin who
// starts the flow is on their org subdomain. The authorize route is auth-gated,
// so only an authorised admin can mint a valid state; a 15-minute expiry + the
// single-use Square `code` prevent replay.
export function signOAuthState(orgId: string): string {
  const payload = `${orgId}.${Date.now() + OAUTH_STATE_TTL_MS}`;
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyOAuthState(state: string | null): string | null {
  if (!state) return null;
  const [b64, sig] = state.split('.');
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  const got = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const [orgId, expStr] = payload.split('.');
  const exp = Number(expStr);
  if (!orgId || !Number.isFinite(exp) || exp < Date.now()) return null;
  return orgId;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getApplicationId(),
    scope: SQUARE_OAUTH_SCOPES.join(' '),
    session: 'false',
    state,
  });
  if (process.env.SQUARE_OAUTH_REDIRECT_URL) {
    params.set('redirect_uri', process.env.SQUARE_OAUTH_REDIRECT_URL);
  }
  return `${squareBaseUrl()}/oauth2/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${squareBaseUrl()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': SQUARE_VERSION },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse & {
    errors?: { detail?: string }[];
  };
  if (!res.ok) {
    throw new Error(`Square OAuth token error: ${data?.errors?.[0]?.detail ?? res.statusText}`);
  }
  return data;
}

async function fetchMainLocationId(accessToken: string): Promise<string> {
  const client = getSquareClient(accessToken);
  const res = await client.locations.list();
  const loc = res.locations?.find((l) => l.status === 'ACTIVE') ?? res.locations?.[0];
  if (!loc?.id) throw new Error('No Square location found for the connected account');
  return loc.id;
}

// Exchange an authorization code for tokens, read the seller's main location,
// and persist the connection with tokens encrypted at rest.
export async function exchangeCodeAndStore(orgId: string, code: string): Promise<void> {
  const tokens = await postToken({
    client_id: getApplicationId(),
    client_secret: getApplicationSecret(),
    code,
    grant_type: 'authorization_code',
    ...(process.env.SQUARE_OAUTH_REDIRECT_URL
      ? { redirect_uri: process.env.SQUARE_OAUTH_REDIRECT_URL }
      : {}),
  });

  const locationId = await fetchMainLocationId(tokens.access_token);

  const data = {
    merchantId: tokens.merchant_id,
    locationId,
    accessTokenEnc: encryptSecret(tokens.access_token),
    refreshTokenEnc: encryptSecret(tokens.refresh_token),
    tokenExpiresAt: new Date(tokens.expires_at),
    scopes: SQUARE_OAUTH_SCOPES,
    revokedAt: null,
  };
  await prisma.squareConnection.upsert({
    where: { clerkOrganizationId: orgId },
    create: { clerkOrganizationId: orgId, ...data },
    update: data,
  });
}

export async function getConnection(orgId: string) {
  return prisma.squareConnection.findUnique({ where: { clerkOrganizationId: orgId } });
}

// A usable access token + location id for the org, lazily refreshing when the
// token is near expiry. Throws if the org isn't connected or was revoked.
export async function getValidAccessToken(
  orgId: string
): Promise<{ accessToken: string; locationId: string }> {
  const conn = await prisma.squareConnection.findUnique({ where: { clerkOrganizationId: orgId } });
  if (!conn || conn.revokedAt) throw new Error('Square is not connected for this organisation');

  if (conn.tokenExpiresAt.getTime() - Date.now() > REFRESH_THRESHOLD_MS) {
    return { accessToken: decryptSecret(conn.accessTokenEnc), locationId: conn.locationId };
  }

  const tokens = await postToken({
    client_id: getApplicationId(),
    client_secret: getApplicationSecret(),
    refresh_token: decryptSecret(conn.refreshTokenEnc),
    grant_type: 'refresh_token',
  });
  const updated = await prisma.squareConnection.update({
    where: { clerkOrganizationId: orgId },
    data: {
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : conn.refreshTokenEnc,
      tokenExpiresAt: new Date(tokens.expires_at),
      merchantId: tokens.merchant_id ?? conn.merchantId,
    },
  });
  return { accessToken: decryptSecret(updated.accessTokenEnc), locationId: updated.locationId };
}

// Refresh any connections nearing expiry. Called by the worker on a schedule so
// long-idle orgs don't lapse before their next charge.
export async function refreshExpiringConnections(): Promise<number> {
  const soon = new Date(Date.now() + REFRESH_THRESHOLD_MS);
  const due = await prisma.squareConnection.findMany({
    where: { revokedAt: null, tokenExpiresAt: { lte: soon } },
    select: { clerkOrganizationId: true },
  });
  let refreshed = 0;
  for (const c of due) {
    try {
      await getValidAccessToken(c.clerkOrganizationId);
      refreshed += 1;
    } catch {
      // Leave it; the next charge attempt will surface the failure.
    }
  }
  return refreshed;
}

export async function revokeConnection(orgId: string): Promise<void> {
  const conn = await prisma.squareConnection.findUnique({ where: { clerkOrganizationId: orgId } });
  if (!conn) return;
  const accessToken = decryptSecret(conn.accessTokenEnc);
  // RevokeToken requires `Authorization: Client APPLICATION_SECRET`.
  await fetch(`${squareBaseUrl()}/oauth2/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
      Authorization: `Client ${getApplicationSecret()}`,
    },
    body: JSON.stringify({ client_id: getApplicationId(), access_token: accessToken }),
  }).catch(() => {});
  await prisma.squareConnection.update({
    where: { clerkOrganizationId: orgId },
    data: { revokedAt: new Date() },
  });
}

// Mark a connection revoked from the oauth.authorization.revoked webhook, and
// pause that org's recurring subscriptions so the worker stops trying to charge.
export async function markRevokedByMerchant(merchantId: string): Promise<void> {
  const conns = await prisma.squareConnection.findMany({
    where: { merchantId, revokedAt: null },
    select: { clerkOrganizationId: true },
  });
  await prisma.squareConnection.updateMany({
    where: { merchantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  for (const c of conns) {
    await prisma.recurringSubscription.updateMany({
      where: { clerkOrganizationId: c.clerkOrganizationId, status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] } },
      data: { status: 'PAST_DUE' },
    });
  }
}
