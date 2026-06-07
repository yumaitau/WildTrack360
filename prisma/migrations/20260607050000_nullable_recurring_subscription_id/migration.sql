-- Make recurring_donations.stripe_subscription_id nullable so we can persist
-- a local pending row BEFORE calling Stripe — the cuid then serves as the
-- Stripe idempotency key. Once Stripe returns, the column is patched in.
-- The @unique constraint still holds because Postgres allows multiple NULLs
-- under a UNIQUE index.

ALTER TABLE "public"."recurring_donations"
  ALTER COLUMN "stripe_subscription_id" DROP NOT NULL;
