-- Database Update Script for WildHub
-- Run this script to add missing fields and tables

-- 1. Add type field to species table if it doesn't exist
ALTER TABLE species
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- 2. Add description field to species table if it doesn't exist
ALTER TABLE species
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Add careRequirements field to species table if it doesn't exist
ALTER TABLE species
ADD COLUMN IF NOT EXISTS "careRequirements" TEXT;

-- 4. Add scientificName field to species table if it doesn't exist
ALTER TABLE species
ADD COLUMN IF NOT EXISTS "scientificName" VARCHAR(255);

-- 5. Create carer_trainings table if it doesn't exist
CREATE TABLE IF NOT EXISTS carer_trainings (
    id VARCHAR(30) PRIMARY KEY DEFAULT (concat('cuid_', substr(md5(random()::text || clock_timestamp()::text), 1, 24))),
    "carerId" VARCHAR(30) NOT NULL,
    "courseName" VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    date TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clerkUserId" VARCHAR(255) NOT NULL,
    "clerkOrganizationId" VARCHAR(255) NOT NULL,
    CONSTRAINT fk_carer_training_carer FOREIGN KEY ("carerId") REFERENCES carers(id) ON DELETE CASCADE
);

-- 6. Create index on carer_trainings for better query performance
CREATE INDEX IF NOT EXISTS idx_carer_trainings_carer_id ON carer_trainings("carerId");
CREATE INDEX IF NOT EXISTS idx_carer_trainings_expiry_date ON carer_trainings("expiryDate");
CREATE INDEX IF NOT EXISTS idx_carer_trainings_org_id ON carer_trainings("clerkOrganizationId");

-- 7. Add trigger to update updatedAt timestamp on carer_trainings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_carer_trainings_updated_at ON carer_trainings;
CREATE TRIGGER update_carer_trainings_updated_at 
    BEFORE UPDATE ON carer_trainings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Add any missing fields to carers table for NSW compliance
ALTER TABLE carers
ADD COLUMN IF NOT EXISTS "streetAddress" VARCHAR(255),
ADD COLUMN IF NOT EXISTS suburb VARCHAR(255),
ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'NSW',
ADD COLUMN IF NOT EXISTS postcode VARCHAR(10),
ADD COLUMN IF NOT EXISTS "executivePosition" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "speciesCoordinatorFor" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "rehabilitatesKoala" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "rehabilitatesFlyingFox" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "rehabilitatesBirdOfPrey" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "memberSince" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "trainingLevel" VARCHAR(255);

-- 9. Add specialties array field to carers if using PostgreSQL
-- Note: This assumes you're using PostgreSQL which supports arrays
ALTER TABLE carers
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';

-- 10. Add sample training data (optional - comment out if not needed)
-- INSERT INTO carer_trainings (
--     "carerId", 
--     "courseName", 
--     provider, 
--     date, 
--     "expiryDate", 
--     "clerkUserId", 
--     "clerkOrganizationId"
-- )
-- SELECT 
--     c.id,
--     'Wildlife First Aid',
--     'NSW Wildlife Council',
--     CURRENT_TIMESTAMP - INTERVAL '6 months',
--     CURRENT_TIMESTAMP + INTERVAL '6 months',
--     c."clerkUserId",
--     c."clerkOrganizationId"
-- FROM carers c
-- WHERE NOT EXISTS (
--     SELECT 1 FROM carer_trainings ct 
--     WHERE ct."carerId" = c.id 
--     AND ct."courseName" = 'Wildlife First Aid'
-- )
-- LIMIT 1;

-- 11. Verify the updates
DO $$
BEGIN
    RAISE NOTICE 'Database update script completed successfully';
    RAISE NOTICE 'Tables updated: species, carers, carer_trainings';
    RAISE NOTICE 'Please run "npx prisma generate" to update your Prisma client';
END $$;