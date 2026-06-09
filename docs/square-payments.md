# Square payments (app-fee / OAuth model)

WildTrack360 processes donations and membership fees through **Square**, using the
[Payments API Application Fee](https://developer.squareup.com/docs/payments-api/take-payments-and-collect-fees)
model. Each organisation connects **their own** Square account via OAuth; we charge on their behalf
with `app_fee_money` = 5%. Funds settle into the org's Square account and the 5% fee is deposited to
the platform account automatically — no funds flow through the platform, no manual payouts.

Recurring donations/memberships are **self-billed**: Square's native Subscriptions API can't attach an
app fee, so we vault a card-on-file on the org's account and a scheduled job charges it each cycle via
`CreatePayment` + `app_fee_money`. Memberships are always an annual auto-renewing commitment.

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
| Scheduled jobs (charge sweep, token refresh) | `src/scripts/*` |
| OAuth + webhook routes | `src/app/api/square/**` |
| Card form (Web Payments SDK) | `src/components/portal/square-checkout.tsx` |

## Environment

See `.env.example`. Required: `SQUARE_ENVIRONMENT`, `SQUARE_APPLICATION_ID`,
`SQUARE_APPLICATION_SECRET`, `NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `SQUARE_OAUTH_REDIRECT_URL`,
`SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL`, `ENCRYPTION_KEY`.

Generate an encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Square Developer Dashboard setup

1. Create an application; accept the PAAF PDS/FSG (Australia).
2. **OAuth** → set the redirect URL to `SQUARE_OAUTH_REDIRECT_URL`
   (`https://<host>/api/square/oauth/callback`).
3. **Webhooks** → subscribe `SQUARE_WEBHOOK_NOTIFICATION_URL`
   (`https://<host>/api/square/webhook`) to events: `payment.created`, `payment.updated`,
   `refund.created`, `refund.updated`, `oauth.authorization.revoked`. Copy the signature key into
   `SQUARE_WEBHOOK_SIGNATURE_KEY`.

## Scheduled jobs

Two one-shot CLI scripts (run once, exit) — no Redis, no long-running worker. All billing state
(`nextChargeAt`, `failedAttempts`/dunning) lives in the DB, so each run just processes what's due:

- `npm run charge-due` (`src/scripts/charge-due-subscriptions.ts`) — charges every
  `RecurringSubscription` whose `nextChargeAt` has passed; after 4 consecutive failures the sub + its
  memberships cancel. Re-running is safe — each sub advances its own `nextChargeAt`.
- `npm run refresh-tokens` (`src/scripts/refresh-square-tokens.ts`) — refreshes Square OAuth tokens
  nearing their 30-day expiry.

Both need `DATABASE_URL` + the Square / `ENCRYPTION_KEY` / `RESEND_*` vars (they charge cards and email
receipts), and run via `tsx` (a production dependency; `src/` + `tsconfig.json` ship in the image).

### Local

`docker compose up -d` (Postgres), then run a script directly, e.g. `npm run charge-due`.

### Production — Coolify Scheduled Tasks

The single app image already contains everything. In the Coolify **app** → **Scheduled Tasks**, add:

| Name | Command | Frequency | Container |
| --- | --- | --- | --- |
| Charge due memberships | `npm run charge-due` | `0 2 * * *` | the app container |
| Refresh Square tokens | `npm run refresh-tokens` | `0 */6 * * *` | the app container |

Bump the task **Timeout** above 300s if a single sweep ever has many same-day renewals (unprocessed
subs simply roll to the next run — no double-charge).

> Note: `vercel.json` is unused on Coolify — its cron does **not** fire here. Any work that relied on
> it (e.g. `nsw-reminders`) should also become a Coolify Scheduled Task.

## Sandbox test flow

1. `SQUARE_ENVIRONMENT=sandbox`, fill sandbox app id/secret/signature key.
2. Admin → Payments → Square settings → **Connect Square account** (OAuth a sandbox seller).
3. Portal → Donate / Membership → pay with sandbox card `4111 1111 1111 1111`, any future expiry, CVV
   `111`, postcode `12345`.
4. Verify in the Square sandbox dashboard: the seller receives the amount, the platform app receives
   the 5% app fee. Locally, a `Payment` + `Donation`/`Membership` row appears and the receipt number
   mints once.
5. Recurring: join an annual membership → card vaulted + first charge taken. To exercise a renewal,
   set the sub's `nextChargeAt` into the past and run `npm run charge-due`.
