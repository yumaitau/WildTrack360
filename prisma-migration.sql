-- Prisma Migration SQL Script
-- This migration ensures all tables match the Prisma schema

-- Update species table
ALTER TABLE "species" 
ADD COLUMN IF NOT EXISTS "scientificName" TEXT,
ADD COLUMN IF NOT EXISTS "type" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "careRequirements" TEXT;

-- Update carers table
ALTER TABLE "carers"
ADD COLUMN IF NOT EXISTS "licenseExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "street_address" TEXT,
ADD COLUMN IF NOT EXISTS "suburb" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT DEFAULT 'NSW',
ADD COLUMN IF NOT EXISTS "postcode" TEXT,
ADD COLUMN IF NOT EXISTS "executive_position" TEXT,
ADD COLUMN IF NOT EXISTS "species_coordinator_for" TEXT,
ADD COLUMN IF NOT EXISTS "rehabilitates_koala" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "rehabilitates_flying_fox" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "rehabilitates_bird_of_prey" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "member_since" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "training_level" TEXT,
ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create carer_trainings table if not exists
CREATE TABLE IF NOT EXISTS "carer_trainings" (
    "id" TEXT NOT NULL,
    "carerId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "provider" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "carer_trainings_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'carer_trainings_carerId_fkey'
    ) THEN
        ALTER TABLE "carer_trainings" 
        ADD CONSTRAINT "carer_trainings_carerId_fkey" 
        FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "carer_trainings_carerId_idx" ON "carer_trainings"("carerId");
CREATE INDEX IF NOT EXISTS "carer_trainings_clerkOrganizationId_idx" ON "carer_trainings"("clerkOrganizationId");
CREATE INDEX IF NOT EXISTS "carer_trainings_expiryDate_idx" ON "carer_trainings"("expiryDate");