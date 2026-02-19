-- Add environment field to all user-data models for SANDPIT vs PRODUCTION isolation.
-- Existing records default to 'PRODUCTION'.

-- AlterTable
ALTER TABLE "animal_transfers" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "animals" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "carer_trainings" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "carers" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "coordinator_species_assignments" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "hygiene_logs" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "incident_reports" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "nsw_report_metadata" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "org_members" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "permanent_care_approvals" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "photos" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "preserved_specimens" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "records" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "release_checklists" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "species" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "species_groups" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRODUCTION';

-- CreateIndex
CREATE INDEX "animal_transfers_environment_idx" ON "animal_transfers"("environment");

-- CreateIndex
CREATE INDEX "animals_environment_idx" ON "animals"("environment");

-- CreateIndex
CREATE INDEX "assets_environment_idx" ON "assets"("environment");

-- CreateIndex
CREATE INDEX "audit_logs_environment_idx" ON "audit_logs"("environment");

-- CreateIndex
CREATE INDEX "carer_trainings_environment_idx" ON "carer_trainings"("environment");

-- CreateIndex
CREATE INDEX "carers_environment_idx" ON "carers"("environment");

-- CreateIndex
CREATE INDEX "coordinator_species_assignments_environment_idx" ON "coordinator_species_assignments"("environment");

-- CreateIndex
CREATE INDEX "hygiene_logs_environment_idx" ON "hygiene_logs"("environment");

-- CreateIndex
CREATE INDEX "incident_reports_environment_idx" ON "incident_reports"("environment");

-- CreateIndex
CREATE INDEX "nsw_report_metadata_environment_idx" ON "nsw_report_metadata"("environment");

-- CreateIndex
CREATE INDEX "org_members_environment_idx" ON "org_members"("environment");

-- CreateIndex
CREATE INDEX "permanent_care_approvals_environment_idx" ON "permanent_care_approvals"("environment");

-- CreateIndex
CREATE INDEX "photos_environment_idx" ON "photos"("environment");

-- CreateIndex
CREATE INDEX "preserved_specimens_environment_idx" ON "preserved_specimens"("environment");

-- CreateIndex
CREATE INDEX "records_environment_idx" ON "records"("environment");

-- CreateIndex
CREATE INDEX "release_checklists_environment_idx" ON "release_checklists"("environment");

-- CreateIndex
CREATE INDEX "species_environment_idx" ON "species"("environment");

-- CreateIndex
CREATE INDEX "species_groups_environment_idx" ON "species_groups"("environment");
