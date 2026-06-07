'server-only';

import Stripe from 'stripe';

// Stripe client singleton. apiVersion pinned so SDK upgrades can't quietly
// change Connect / PaymentIntent serialization. Pin matches the installed
// stripe package's typed API version.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  cached = new Stripe(key, {
    typescript: true,
    appInfo: { name: 'WildTrack360' },
  });
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  return secret;
}
