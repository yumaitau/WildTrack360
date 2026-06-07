-- Stripe Connect onboarding state, webhook idempotency, payment ledger,
-- donation rows, and per-org receipt sequences. Recurring donations and the
-- RecurringDonation model land with Phase 5 (subscriptions).

CREATE TYPE "public"."PaymentKind" AS ENUM (
  'DONATION_ONE_OFF',
  'DONATION_RECURRING',
  'MEMBERSHIP_ONE_OFF',
  'MEMBERSHIP_RECURRING'
);
CREATE TYPE "public"."PaymentStatus" AS ENUM (
  'REQUIRES_ACTION',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED'
);

CREATE TABLE "public"."stripe_accounts" (
  "clerk_organization_id" TEXT NOT NULL,
  "stripe_account_id" TEXT NOT NULL,
  "account_type" TEXT NOT NULL DEFAULT 'standard',
  "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
  "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
  "details_submitted" BOOLEAN NOT NULL DEFAULT false,
  "country" TEXT NOT NULL DEFAULT 'AU',
  "default_currency" TEXT NOT NULL DEFAULT 'AUD',
  "onboarding_completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "stripe_accounts_pkey" PRIMARY KEY ("clerk_organization_id")
);

CREATE UNIQUE INDEX "stripe_accounts_stripe_account_id_key"
  ON "public"."stripe_accounts"("stripe_account_id");

CREATE TABLE "public"."stripe_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL,

  CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stripe_events_type_idx" ON "public"."stripe_events"("type");

CREATE TABLE "public"."payments" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "member_id" TEXT,
  "kind" "public"."PaymentKind" NOT NULL,
  "stripe_payment_intent_id" TEXT,
  "stripe_invoice_id" TEXT,
  "stripe_charge_id" TEXT,
  "amount_cents" INTEGER NOT NULL,
  "application_fee_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "status" "public"."PaymentStatus" NOT NULL,
  "receipt_url" TEXT,
  "receipt_number" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key"
  ON "public"."payments"("stripe_payment_intent_id");
CREATE UNIQUE INDEX "payments_stripe_invoice_id_key"
  ON "public"."payments"("stripe_invoice_id");
CREATE INDEX "payments_clerk_organization_id_status_idx"
  ON "public"."payments"("clerk_organization_id", "status");
CREATE INDEX "payments_clerk_organization_id_created_at_idx"
  ON "public"."payments"("clerk_organization_id", "created_at");
CREATE INDEX "payments_member_id_idx" ON "public"."payments"("member_id");

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "public"."donations" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "member_id" TEXT,
  "donor_email" TEXT NOT NULL,
  "donor_name" TEXT,
  "amount_cents" INTEGER NOT NULL,
  "fee_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
  "message" TEXT,
  "payment_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "donations_clerk_organization_id_created_at_idx"
  ON "public"."donations"("clerk_organization_id", "created_at");
CREATE INDEX "donations_member_id_idx" ON "public"."donations"("member_id");

ALTER TABLE "public"."donations"
  ADD CONSTRAINT "donations_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."donations"
  ADD CONSTRAINT "donations_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "public"."receipt_sequences" (
  "clerk_organization_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("clerk_organization_id", "year")
);
