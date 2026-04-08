-- CreateTable
CREATE TABLE "public"."species_growth_references" (
    "id" TEXT NOT NULL,
    "species_name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "age_days" INTEGER NOT NULL,
    "weight_grams" DOUBLE PRECISION,
    "head_length_mm" DOUBLE PRECISION,
    "ear_length_mm" DOUBLE PRECISION,
    "arm_length_mm" DOUBLE PRECISION,
    "leg_length_mm" DOUBLE PRECISION,
    "foot_length_mm" DOUBLE PRECISION,
    "tail_length_mm" DOUBLE PRECISION,
    "body_length_mm" DOUBLE PRECISION,
    "wing_length_mm" DOUBLE PRECISION,
    "reference" TEXT,

    CONSTRAINT "species_growth_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."growth_measurements" (
    "id" TEXT NOT NULL,
    "animal_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight_grams" DOUBLE PRECISION,
    "head_length_mm" DOUBLE PRECISION,
    "ear_length_mm" DOUBLE PRECISION,
    "arm_length_mm" DOUBLE PRECISION,
    "leg_length_mm" DOUBLE PRECISION,
    "foot_length_mm" DOUBLE PRECISION,
    "tail_length_mm" DOUBLE PRECISION,
    "body_length_mm" DOUBLE PRECISION,
    "wing_length_mm" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "growth_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_growth_references_species_name_sex_age_days_key" ON "public"."species_growth_references"("species_name", "sex", "age_days");

-- CreateIndex
CREATE INDEX "species_growth_references_species_name_sex_idx" ON "public"."species_growth_references"("species_name", "sex");

-- CreateIndex
CREATE INDEX "growth_measurements_animal_id_idx" ON "public"."growth_measurements"("animal_id");

-- CreateIndex
CREATE INDEX "growth_measurements_clerkOrganizationId_idx" ON "public"."growth_measurements"("clerkOrganizationId");

-- AddForeignKey
ALTER TABLE "public"."growth_measurements" ADD CONSTRAINT "growth_measurements_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
