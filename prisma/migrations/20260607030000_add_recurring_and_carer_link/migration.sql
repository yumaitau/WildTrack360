-- Phase 5: recurring donations via Stripe Subscriptions, Stripe Customer
-- caching on Member, and the optional Carer↔Member link so the same person
-- can be both a carer and a paying member.

CREATE TYPE "public"."SubStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED');

CREATE TABLE "public"."recurring_donations" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "member_id" TEXT,
  "donor_email" TEXT NOT NULL,
  "donor_name" TEXT,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "interval" "public"."BillingInterval" NOT NULL,
  "status" "public"."SubStatus" NOT NULL,
  "stripe_subscription_id" TEXT NOT NULL,
  "stripe_customer_id" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recurring_donations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recurring_donations_stripe_subscription_id_key"
  ON "public"."recurring_donations"("stripe_subscription_id");
CREATE INDEX "recurring_donations_clerk_organization_id_status_idx"
  ON "public"."recurring_donations"("clerk_organization_id", "status");
CREATE INDEX "recurring_donations_member_id_idx"
  ON "public"."recurring_donations"("member_id");

ALTER TABLE "public"."recurring_donations"
  ADD CONSTRAINT "recurring_donations_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."donations"
  ADD COLUMN "recurring_donation_id" TEXT;

ALTER TABLE "public"."donations"
  ADD CONSTRAINT "donations_recurring_donation_id_fkey"
  FOREIGN KEY ("recurring_donation_id") REFERENCES "public"."recurring_donations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."members"
  ADD COLUMN "carer_profile_id" TEXT,
  ADD COLUMN "stripe_customer_id" TEXT;

CREATE UNIQUE INDEX "members_carer_profile_id_key"
  ON "public"."members"("carer_profile_id");

ALTER TABLE "public"."members"
  ADD CONSTRAINT "members_carer_profile_id_fkey"
  FOREIGN KEY ("carer_profile_id") REFERENCES "public"."carers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."stripe_accounts"
  ADD COLUMN "donation_product_id" TEXT;
