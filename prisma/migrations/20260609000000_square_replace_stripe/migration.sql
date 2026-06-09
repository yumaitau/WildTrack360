-- CreateEnum
CREATE TYPE "SubscriptionKind" AS ENUM ('DONATION', 'MEMBERSHIP');

-- DropForeignKey
ALTER TABLE "donations" DROP CONSTRAINT "donations_recurring_donation_id_fkey";

-- DropForeignKey
ALTER TABLE "recurring_donations" DROP CONSTRAINT "recurring_donations_member_id_fkey";

-- DropIndex
DROP INDEX "payments_stripe_invoice_id_key";

-- DropIndex
DROP INDEX "payments_stripe_payment_intent_id_key";

-- AlterTable
ALTER TABLE "donations" DROP COLUMN "recurring_donation_id",
ADD COLUMN     "recurring_subscription_id" TEXT;

-- AlterTable
ALTER TABLE "members" DROP COLUMN "stripe_customer_id",
ADD COLUMN     "square_card_id" TEXT,
ADD COLUMN     "square_customer_id" TEXT;

-- AlterTable
ALTER TABLE "membership_tiers" DROP COLUMN "stripe_price_id",
DROP COLUMN "stripe_product_id";

-- AlterTable
ALTER TABLE "memberships" DROP COLUMN "stripe_subscription_id",
ADD COLUMN     "recurring_subscription_id" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "stripe_charge_id",
DROP COLUMN "stripe_invoice_id",
DROP COLUMN "stripe_payment_intent_id",
ADD COLUMN     "processing_fee_cents" INTEGER,
ADD COLUMN     "square_order_id" TEXT,
ADD COLUMN     "square_payment_id" TEXT;

-- DropTable
DROP TABLE "recurring_donations";

-- DropTable
DROP TABLE "stripe_accounts";

-- DropTable
DROP TABLE "stripe_events";

-- CreateTable
CREATE TABLE "square_connections" (
    "clerk_organization_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "square_connections_pkey" PRIMARY KEY ("clerk_organization_id")
);

-- CreateTable
CREATE TABLE "square_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "square_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_subscriptions" (
    "id" TEXT NOT NULL,
    "clerk_organization_id" TEXT NOT NULL,
    "member_id" TEXT,
    "kind" "SubscriptionKind" NOT NULL,
    "tier_id" TEXT,
    "donor_email" TEXT NOT NULL,
    "donor_name" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "interval" "BillingInterval" NOT NULL,
    "status" "SubStatus" NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "square_customer_id" TEXT NOT NULL,
    "square_card_id" TEXT NOT NULL,
    "next_charge_at" TIMESTAMP(3) NOT NULL,
    "last_charged_at" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "square_connections_merchant_id_key" ON "square_connections"("merchant_id");

-- CreateIndex
CREATE INDEX "square_events_type_idx" ON "square_events"("type");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_clerk_organization_id_status_idx" ON "recurring_subscriptions"("clerk_organization_id", "status");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_member_id_idx" ON "recurring_subscriptions"("member_id");

-- CreateIndex
CREATE INDEX "recurring_subscriptions_status_next_charge_at_idx" ON "recurring_subscriptions"("status", "next_charge_at");

-- CreateIndex
CREATE INDEX "memberships_recurring_subscription_id_idx" ON "memberships"("recurring_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_square_payment_id_key" ON "payments"("square_payment_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_recurring_subscription_id_fkey" FOREIGN KEY ("recurring_subscription_id") REFERENCES "recurring_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_recurring_subscription_id_fkey" FOREIGN KEY ("recurring_subscription_id") REFERENCES "recurring_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_subscriptions" ADD CONSTRAINT "recurring_subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "admin_notification_dismissals_org_id_user_id_kind_reminder_key_" RENAME TO "admin_notification_dismissals_org_id_user_id_kind_reminder__key";

