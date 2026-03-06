-- CreateEnum
CREATE TYPE "public"."CallLogStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."call_logs" (
    "id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "status" "public"."CallLogStatus" NOT NULL DEFAULT 'OPEN',
    "caller_name" TEXT NOT NULL,
    "caller_phone" TEXT,
    "caller_email" TEXT,
    "species" TEXT,
    "location" TEXT,
    "coordinates" JSONB,
    "suburb" TEXT,
    "postcode" TEXT,
    "notes" TEXT,
    "reason" TEXT,
    "referrer" TEXT,
    "action" TEXT,
    "outcome" TEXT,
    "taken_by_user_id" TEXT NOT NULL,
    "taken_by_user_name" TEXT,
    "assigned_to_user_id" TEXT,
    "assigned_to_user_name" TEXT,
    "animal_id" TEXT,
    "clerkOrganizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_log_reasons" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "call_log_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_log_referrers" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "call_log_referrers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_log_actions" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "call_log_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_log_outcomes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "call_log_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_logs_clerkOrganizationId_idx" ON "public"."call_logs"("clerkOrganizationId");

-- CreateIndex
CREATE INDEX "call_logs_status_idx" ON "public"."call_logs"("status");

-- CreateIndex
CREATE INDEX "call_logs_date_time_idx" ON "public"."call_logs"("date_time");

-- CreateIndex
CREATE INDEX "call_log_reasons_clerkOrganizationId_idx" ON "public"."call_log_reasons"("clerkOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "call_log_reasons_label_clerkOrganizationId_key" ON "public"."call_log_reasons"("label", "clerkOrganizationId");

-- CreateIndex
CREATE INDEX "call_log_referrers_clerkOrganizationId_idx" ON "public"."call_log_referrers"("clerkOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "call_log_referrers_label_clerkOrganizationId_key" ON "public"."call_log_referrers"("label", "clerkOrganizationId");

-- CreateIndex
CREATE INDEX "call_log_actions_clerkOrganizationId_idx" ON "public"."call_log_actions"("clerkOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "call_log_actions_label_clerkOrganizationId_key" ON "public"."call_log_actions"("label", "clerkOrganizationId");

-- CreateIndex
CREATE INDEX "call_log_outcomes_clerkOrganizationId_idx" ON "public"."call_log_outcomes"("clerkOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "call_log_outcomes_label_clerkOrganizationId_key" ON "public"."call_log_outcomes"("label", "clerkOrganizationId");

-- AddForeignKey
ALTER TABLE "public"."call_logs" ADD CONSTRAINT "call_logs_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
