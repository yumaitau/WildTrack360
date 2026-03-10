-- CreateEnum
CREATE TYPE "public"."TransferType" AS ENUM ('INTERNAL_CARER', 'INTER_ORGANISATION', 'VET_TRANSFER', 'PERMANENT_CARE_PLACEMENT', 'RELEASE_TRANSFER');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "public"."AnimalStatus" ADD VALUE 'PERMANENT_CARE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditAction" ADD VALUE 'SUBMIT';
ALTER TYPE "public"."AuditAction" ADD VALUE 'APPROVE';
ALTER TYPE "public"."AuditAction" ADD VALUE 'REJECT';
ALTER TYPE "public"."AuditAction" ADD VALUE 'EXPORT';

-- AlterTable
ALTER TABLE "public"."animal_transfers" ADD COLUMN     "authority_evidence_url" TEXT,
ADD COLUMN     "from_carer_id" TEXT,
ADD COLUMN     "receiving_authority_type" TEXT,
ADD COLUMN     "to_carer_id" TEXT,
ADD COLUMN     "transferType" "public"."TransferType" NOT NULL DEFAULT 'INTERNAL_CARER',
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by_user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."animals" ADD COLUMN     "date_admitted" TIMESTAMP(3),
ADD COLUMN     "org_animal_id" TEXT,
ADD COLUMN     "outcome_reason" TEXT;

-- CreateTable
CREATE TABLE "public"."permanent_care_applications" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" TEXT NOT NULL,
    "submitted_by_user_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "non_releasable_reasons" TEXT NOT NULL,
    "euthanasia_justification" TEXT NOT NULL,
    "vet_report_url" TEXT,
    "vet_name" TEXT,
    "vet_clinic" TEXT,
    "vet_contact" TEXT,
    "npws_approval_number" TEXT,
    "npws_approval_date" TIMESTAMP(3),
    "keeper_name" TEXT,
    "facility_name" TEXT,
    "facility_address" TEXT,
    "facility_suburb" TEXT,
    "facility_state" TEXT DEFAULT 'NSW',
    "facility_postcode" TEXT,
    "category" "public"."PermanentCareCategory",
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "permanent_care_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permanent_care_applications_animalId_idx" ON "public"."permanent_care_applications"("animalId");

-- CreateIndex
CREATE INDEX "permanent_care_applications_clerkOrganizationId_idx" ON "public"."permanent_care_applications"("clerkOrganizationId");

-- CreateIndex
CREATE INDEX "permanent_care_applications_status_idx" ON "public"."permanent_care_applications"("status");

-- CreateIndex
CREATE INDEX "animal_transfers_animalId_idx" ON "public"."animal_transfers"("animalId");

-- CreateIndex
CREATE INDEX "animal_transfers_clerkOrganizationId_idx" ON "public"."animal_transfers"("clerkOrganizationId");

-- AddForeignKey
ALTER TABLE "public"."permanent_care_applications" ADD CONSTRAINT "permanent_care_applications_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
