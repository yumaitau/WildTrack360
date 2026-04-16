-- AlterTable: add memberId to CarerProfile
ALTER TABLE "public"."carers" ADD COLUMN "member_id" TEXT;

-- CreateTable: OrganisationSettings
CREATE TABLE "public"."organisation_settings" (
    "id" TEXT NOT NULL,
    "clerk_organisation_id" TEXT NOT NULL,
    "org_short_code" TEXT NOT NULL DEFAULT 'ORG',
    "animal_id_template" TEXT NOT NULL DEFAULT '{ORG_SHORT}-{YYYY}-{seq:4}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AnimalIdSequence
CREATE TABLE "public"."animal_id_sequences" (
    "id" TEXT NOT NULL,
    "clerk_organisation_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "animal_id_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_settings_clerk_organisation_id_key" ON "public"."organisation_settings"("clerk_organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "animal_id_sequences_clerk_organisation_id_year_key" ON "public"."animal_id_sequences"("clerk_organisation_id", "year");
