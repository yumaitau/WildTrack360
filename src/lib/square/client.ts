'server-only';

import { SquareClient, SquareEnvironment } from 'square';

// Square API version pinned for the raw OAuth REST calls (token/revoke). The
// SDK pins its own version for the typed endpoints.
export const SQUARE_VERSION = '2025-04-16';

function environment(): string {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

// Base URL for the OAuth endpoints (authorize / token / revoke).
export function squareBaseUrl(): string {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

// A SquareClient bound to one org's OAuth access token. Used for charging on
// that org's behalf (CreatePayment + app_fee_money), card-on-file, customers,
// refunds and location lookup.
export function getSquareClient(accessToken: string): SquareClient {
  if (!accessToken) throw new Error('Square access token required');
  return new SquareClient({ token: accessToken, environment: environment() });
}

export function getApplicationId(): string {
  const id = process.env.SQUARE_APPLICATION_ID;
  if (!id) throw new Error('SQUARE_APPLICATION_ID is not configured');
  return id;
}

export function getApplicationSecret(): string {
  const secret = process.env.SQUARE_APPLICATION_SECRET;
  if (!secret) throw new Error('SQUARE_APPLICATION_SECRET is not configured');
  return secret;
}

export function getWebhookSignatureKey(): string {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) throw new Error('SQUARE_WEBHOOK_SIGNATURE_KEY is not configured');
  return key;
}
