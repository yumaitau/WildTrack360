-- CreateEnum
CREATE TYPE "public"."SmsTier" AS ENUM ('NONE', 'LITE', 'STANDARD', 'PRO');

-- CreateEnum
CREATE TYPE "public"."SmsStatus" AS ENUM ('SENT', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT');

-- CreateTable
CREATE TABLE "public"."sms_subscriptions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "tier" "public"."SmsTier" NOT NULL DEFAULT 'NONE',
    "monthly_limit" INTEGER,
    "overage_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sms_usage_summaries" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "environment" "public"."Environment" NOT NULL DEFAULT 'PRODUCTION',
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "overage_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_usage_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sms_logs" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "environment" "public"."Environment" NOT NULL DEFAULT 'PRODUCTION',
    "recipient_phone" TEXT NOT NULL,
    "message_preview" TEXT,
    "purpose" TEXT NOT NULL,
    "sent_by_id" TEXT,
    "status" "public"."SmsStatus" NOT NULL,
    "sns_message_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_subscriptions_organisation_id_key" ON "public"."sms_subscriptions"("organisation_id");

-- CreateIndex
CREATE INDEX "sms_usage_summaries_organisation_id_idx" ON "public"."sms_usage_summaries"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sms_usage_summaries_organisation_id_environment_year_month_key" ON "public"."sms_usage_summaries"("organisation_id", "environment", "year", "month");

-- CreateIndex
CREATE INDEX "sms_logs_organisation_id_idx" ON "public"."sms_logs"("organisation_id");

-- CreateIndex
CREATE INDEX "sms_logs_organisation_id_createdAt_idx" ON "public"."sms_logs"("organisation_id", "createdAt");

-- Month range constraint
ALTER TABLE "public"."sms_usage_summaries" ADD CONSTRAINT chk_month_range CHECK ("month" BETWEEN 1 AND 12);
