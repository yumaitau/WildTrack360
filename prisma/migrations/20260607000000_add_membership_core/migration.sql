-- Phase 1 of the membership database: core Member, MembershipTier, and
-- Membership tables plus the enums they depend on. Custom-field templates,
-- Stripe Connect, and payment tables ship in later phases.

CREATE TYPE "public"."MemberStatus" AS ENUM ('ACTIVE', 'LAPSED', 'CANCELLED', 'DECEASED');
CREATE TYPE "public"."BillingInterval" AS ENUM ('ONE_OFF', 'MONTHLY', 'ANNUAL', 'LIFETIME');
CREATE TYPE "public"."MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "public"."GstHandling" AS ENUM ('NONE', 'INCLUSIVE', 'EXCLUSIVE');

CREATE TABLE "public"."members" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "clerk_user_id" TEXT,
  "email" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "phone" TEXT,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "suburb" TEXT,
  "state" TEXT,
  "postcode" TEXT,
  "country" TEXT NOT NULL DEFAULT 'AU',
  "member_number" TEXT,
  "status" "public"."MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "custom_fields_json" JSONB NOT NULL DEFAULT '{}',
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "members_clerk_organization_id_email_key"
  ON "public"."members"("clerk_organization_id", "email");
CREATE UNIQUE INDEX "members_clerk_organization_id_member_number_key"
  ON "public"."members"("clerk_organization_id", "member_number");
CREATE INDEX "members_clerk_organization_id_status_idx"
  ON "public"."members"("clerk_organization_id", "status");
CREATE INDEX "members_clerk_user_id_idx"
  ON "public"."members"("clerk_user_id");

CREATE TABLE "public"."membership_tiers" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "billing_interval" "public"."BillingInterval" NOT NULL,
  "gst_handling" "public"."GstHandling" NOT NULL DEFAULT 'NONE',
  "stripe_product_id" TEXT,
  "stripe_price_id" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "membership_tiers_clerk_organization_id_active_idx"
  ON "public"."membership_tiers"("clerk_organization_id", "active");

CREATE TABLE "public"."memberships" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "tier_id" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "status" "public"."MembershipStatus" NOT NULL,
  "stripe_subscription_id" TEXT,
  "payment_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "memberships_clerk_organization_id_status_idx"
  ON "public"."memberships"("clerk_organization_id", "status");
CREATE INDEX "memberships_member_id_period_end_idx"
  ON "public"."memberships"("member_id", "period_end");

ALTER TABLE "public"."memberships"
  ADD CONSTRAINT "memberships_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."memberships"
  ADD CONSTRAINT "memberships_tier_id_fkey"
  FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Per-org Stripe / DGR settings live on OrganisationSettings so admins can
-- configure receipt templates and Stripe Connect onboarding in one place.
ALTER TABLE "public"."organisation_settings"
  ADD COLUMN "abn" TEXT,
  ADD COLUMN "dgr_endorsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "receipt_prefix" TEXT;
