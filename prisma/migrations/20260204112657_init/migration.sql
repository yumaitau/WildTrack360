-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('ADMITTED', 'IN_CARE', 'READY_FOR_RELEASE', 'RELEASED', 'DECEASED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('FEEDING', 'MEDICAL', 'BEHAVIOR', 'LOCATION', 'WEIGHT', 'RELEASE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('HARD', 'SOFT', 'PASSIVE');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'COORDINATOR', 'CARER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ROLE_CHANGE', 'ASSIGN', 'UNASSIGN');

-- CreateEnum
CREATE TYPE "PermanentCareCategory" AS ENUM ('EDUCATION', 'COMPANION', 'RESEARCH');

-- CreateEnum
CREATE TYPE "PermanentCareStatus" AS ENUM ('ALIVE', 'DEAD');

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "sex" TEXT,
    "ageClass" TEXT,
    "age" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "status" "AnimalStatus" NOT NULL,
    "dateFound" TIMESTAMP(3) NOT NULL,
    "dateReleased" TIMESTAMP(3),
    "outcomeDate" TIMESTAMP(3),
    "outcome" TEXT,
    "photo" TEXT,
    "notes" TEXT,
    "rescueLocation" TEXT,
    "rescueCoordinates" JSONB,
    "rescue_address" TEXT,
    "rescue_suburb" TEXT,
    "rescue_postcode" TEXT,
    "releaseLocation" TEXT,
    "releaseCoordinates" JSONB,
    "releaseNotes" TEXT,
    "release_address" TEXT,
    "release_suburb" TEXT,
    "release_postcode" TEXT,
    "encounter_type" TEXT,
    "initial_weight_grams" INTEGER,
    "weight_unit" TEXT DEFAULT 'g',
    "animal_condition" TEXT,
    "pouch_condition" TEXT,
    "fate" TEXT,
    "mark_band_microchip" TEXT,
    "life_stage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,
    "carerId" TEXT,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "type" "RecordType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "type" TEXT,
    "description" TEXT,
    "careRequirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "jurisdiction" TEXT,
    "specialties" TEXT[],
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "street_address" TEXT,
    "suburb" TEXT,
    "state" TEXT DEFAULT 'NSW',
    "postcode" TEXT,
    "executive_position" TEXT,
    "species_coordinator_for" TEXT,
    "rehabilitates_koala" BOOLEAN NOT NULL DEFAULT false,
    "rehabilitates_flying_fox" BOOLEAN NOT NULL DEFAULT false,
    "rehabilitates_bird_of_prey" BOOLEAN NOT NULL DEFAULT false,
    "member_since" TIMESTAMP(3),
    "training_level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "carers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carer_trainings" (
    "id" TEXT NOT NULL,
    "carerId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "provider" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "certificateNumber" TEXT,
    "trainingType" TEXT,
    "trainingHours" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "carer_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hygiene_logs" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "enclosureCleaned" BOOLEAN NOT NULL DEFAULT false,
    "ppeUsed" BOOLEAN NOT NULL DEFAULT false,
    "handwashAvailable" BOOLEAN NOT NULL DEFAULT false,
    "feedingBowlsDisinfected" BOOLEAN NOT NULL DEFAULT false,
    "quarantineSignsPresent" BOOLEAN NOT NULL DEFAULT false,
    "photos" JSONB,
    "carerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "hygiene_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,
    "personInvolved" TEXT,
    "reportedTo" TEXT,
    "actionTaken" TEXT,
    "location" TEXT,
    "animalId" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_checklists" (
    "id" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "animalId" TEXT NOT NULL,
    "releaseLocation" TEXT NOT NULL,
    "releaseCoordinates" JSONB,
    "within10km" BOOLEAN NOT NULL DEFAULT false,
    "releaseType" "ReleaseType" NOT NULL,
    "fitnessIndicators" TEXT[],
    "vetSignOff" JSONB,
    "photos" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "release_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssetStatus" NOT NULL,
    "location" TEXT,
    "assignedTo" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "lastMaintenance" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_transfers" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "reasonForTransfer" TEXT NOT NULL,
    "receivingEntity" TEXT NOT NULL,
    "receivingEntityType" TEXT,
    "receivingLicense" TEXT,
    "receivingContactName" TEXT,
    "receivingContactPhone" TEXT,
    "receivingContactEmail" TEXT,
    "receivingOrgAnimalId" TEXT,
    "receivingAddress" TEXT,
    "receivingSuburb" TEXT,
    "receivingState" TEXT,
    "receivingPostcode" TEXT,
    "transferAuthorizedBy" TEXT,
    "transferNotes" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "animal_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permanent_care_approvals" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "npwsApprovalDate" TIMESTAMP(3) NOT NULL,
    "npwsApprovalNumber" TEXT NOT NULL,
    "approvalCategory" "PermanentCareCategory" NOT NULL,
    "facilityName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "keeperName" TEXT,
    "address" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NSW',
    "postcode" TEXT NOT NULL,
    "status" "PermanentCareStatus" NOT NULL DEFAULT 'ALIVE',
    "statusLastUpdated" TIMESTAMP(3),
    "deathDate" TIMESTAMP(3),
    "deathReason" TEXT,
    "approvalDocumentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "permanent_care_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preserved_specimens" (
    "id" TEXT NOT NULL,
    "animalId" TEXT,
    "species" TEXT NOT NULL,
    "registerReferenceNumber" TEXT NOT NULL,
    "specimenDescription" TEXT NOT NULL,
    "preservationMethod" TEXT,
    "preservationDate" TIMESTAMP(3),
    "facilityName" TEXT NOT NULL,
    "facilityLicense" TEXT,
    "storageAddress" TEXT NOT NULL,
    "storageSuburb" TEXT NOT NULL,
    "storageState" TEXT NOT NULL DEFAULT 'NSW',
    "storagePostcode" TEXT NOT NULL,
    "scientificPurpose" TEXT,
    "authorizedBy" TEXT,
    "notes" TEXT,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "preserved_specimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nsw_report_metadata" (
    "id" TEXT NOT NULL,
    "reportYear" INTEGER NOT NULL,
    "reportPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportPeriodEnd" TIMESTAMP(3) NOT NULL,
    "organizationName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "submittedDate" TIMESTAMP(3),
    "submittedBy" TEXT,
    "nilReturn" BOOLEAN NOT NULL DEFAULT false,
    "totalAnimals" INTEGER NOT NULL DEFAULT 0,
    "totalTransfers" INTEGER NOT NULL DEFAULT 0,
    "totalPermanentCare" INTEGER NOT NULL DEFAULT 0,
    "totalPreservedSpecimens" INTEGER NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "reportFileUrl" TEXT,
    "reportHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "nsw_report_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nsw_encounter_types" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nsw_encounter_types_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "nsw_fates" (
    "key" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nsw_fates_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "nsw_pouch_conditions" (
    "key" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nsw_pouch_conditions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "nsw_animal_conditions" (
    "key" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nsw_animal_conditions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "nsw_life_stages" (
    "key" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nsw_life_stages_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'CARER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_groups" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "speciesNames" TEXT[],
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coordinator_species_assignments" (
    "id" TEXT NOT NULL,
    "orgMemberId" TEXT NOT NULL,
    "speciesGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coordinator_species_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carer_trainings_carerId_idx" ON "carer_trainings"("carerId");
CREATE INDEX "carer_trainings_expiryDate_idx" ON "carer_trainings"("expiryDate");
CREATE INDEX "carer_trainings_clerkOrganizationId_idx" ON "carer_trainings"("clerkOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "permanent_care_approvals_animalId_key" ON "permanent_care_approvals"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "preserved_specimens_animalId_key" ON "preserved_specimens"("animalId");
CREATE UNIQUE INDEX "preserved_specimens_registerReferenceNumber_key" ON "preserved_specimens"("registerReferenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_userId_orgId_key" ON "org_members"("userId", "orgId");
CREATE INDEX "org_members_orgId_idx" ON "org_members"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "species_groups_slug_orgId_key" ON "species_groups"("slug", "orgId");
CREATE INDEX "species_groups_orgId_idx" ON "species_groups"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "coordinator_species_assignments_orgMemberId_speciesGroupId_key" ON "coordinator_species_assignments"("orgMemberId", "speciesGroupId");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_carerId_fkey" FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carer_trainings" ADD CONSTRAINT "carer_trainings_carerId_fkey" FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hygiene_logs" ADD CONSTRAINT "hygiene_logs_carerId_fkey" FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_checklists" ADD CONSTRAINT "release_checklists_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_transfers" ADD CONSTRAINT "animal_transfers_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permanent_care_approvals" ADD CONSTRAINT "permanent_care_approvals_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preserved_specimens" ADD CONSTRAINT "preserved_specimens_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinator_species_assignments" ADD CONSTRAINT "coordinator_species_assignments_orgMemberId_fkey" FOREIGN KEY ("orgMemberId") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinator_species_assignments" ADD CONSTRAINT "coordinator_species_assignments_speciesGroupId_fkey" FOREIGN KEY ("speciesGroupId") REFERENCES "species_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
