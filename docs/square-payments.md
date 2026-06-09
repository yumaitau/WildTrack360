# Square payments (app-fee / OAuth model)

WildTrack360 processes donations and membership fees through **Square**, using the
[Payments API Application Fee](https://developer.squareup.com/docs/payments-api/take-payments-and-collect-fees)
model. Each organisation connects **their own** Square account via OAuth; we charge on their behalf
with `app_fee_money` = 5%. Funds settle into the org's Square account and the 5% fee is deposited to
the platform account automatically — no funds flow through the platform, no manual payouts.

Recurring donations/memberships are **self-billed**: Square's native Subscriptions API can't attach an
app fee, so we vault a card-on-file on the org's account and a BullMQ worker charges it each cycle via
`CreatePayment` + `app_fee_money`.

> **AU compliance:** collecting an application fee in Australia requires accepting Square's *Payments
> API Application Fee (PAAF)* Product Disclosure Statement + Financial Services Guide on the platform
> Square developer account.

## Architecture

| Piece | Path |
| --- | --- |
| Square SDK client, env | `src/lib/square/client.ts` |
| OAuth (authorize / token / refresh / revoke) | `src/lib/square/oauth.ts` |
| Token encryption at rest (AES-256-GCM) | `src/lib/crypto.ts` |
| One-off charges (donation / membership) | `src/lib/square/checkout.ts` |
| Card-on-file + customers | `src/lib/square/cards.ts` |
| Recurring subscription create / cancel | `src/lib/square/subscriptions.ts` |
| Self-billed charge engine + dunning | `src/lib/square/billing.ts` |
| Webhook verify + dispatch + receipt mint | `src/lib/square/webhook.ts` |
| BullMQ worker (cron schedulers) | `src/worker/*` |
| OAuth + webhook routes | `src/app/api/square/**` |
| Card form (Web Payments SDK) | `src/components/portal/square-checkout.tsx` |

## Environment

See `.env.example`. Required: `SQUARE_ENVIRONMENT`, `SQUARE_APPLICATION_ID`,
`SQUARE_APPLICATION_SECRET`, `NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `SQUARE_OAUTH_REDIRECT_URL`,
`SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL`, `REDIS_URL`, `ENCRYPTION_KEY`.

Generate an encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Square Developer Dashboard setup

1. Create an application; accept the PAAF PDS/FSG (Australia).
2. **OAuth** → set the redirect URL to `SQUARE_OAUTH_REDIRECT_URL`
   (`https://<host>/api/square/oauth/callback`).
3. **Webhooks** → subscribe `SQUARE_WEBHOOK_NOTIFICATION_URL`
   (`https://<host>/api/square/webhook`) to events: `payment.created`, `payment.updated`,
   `refund.created`, `refund.updated`, `oauth.authorization.revoked`. Copy the signature key into
   `SQUARE_WEBHOOK_SIGNATURE_KEY`.

## The recurring worker

The worker is a **separate long-running process** (it can't run on Vercel serverless). It needs
`DATABASE_URL` + `REDIS_URL`.

```bash
# local
docker run -d -p 6379:6379 redis:7-alpine
npm run worker          # tsx src/worker/worker-main.ts
```

It registers two BullMQ job schedulers on boot:
- `charge-due-subscriptions` (`0 2 * * *`) — charges every `RecurringSubscription` whose
  `nextChargeAt` has passed. Dunning: after 4 consecutive failures the sub + its memberships cancel.
- `refresh-square-tokens` (`0 */6 * * *`) — refreshes Square OAuth tokens nearing their 30-day expiry.

For production, run it as its own service (e.g. a container with `CMD ["npm","run","worker"]`)
alongside a Redis instance.

## Sandbox test flow

1. `SQUARE_ENVIRONMENT=sandbox`, fill sandbox app id/secret/signature key.
2. Admin → Payments → Square settings → **Connect Square account** (OAuth a sandbox seller).
3. Portal → Donate / Membership → pay with sandbox card `4111 1111 1111 1111`, any future expiry, CVV
   `111`, postcode `12345`.
4. Verify in the Square sandbox dashboard: the seller receives the amount, the platform app receives
   the 5% app fee. Locally, a `Payment` + `Donation`/`Membership` row appears and the receipt number
   mints once.
5. Recurring: pick a monthly tier → card vaulted + first charge taken. To exercise a renewal, set the
   sub's `nextChargeAt` into the past and run the worker (or wait for the 02:00 sweep).
