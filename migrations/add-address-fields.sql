-- Add address fields to animals and carers tables for NSW reporting compliance
-- All fields are nullable to preserve existing data

-- Add detailed rescue address fields to animals table
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS rescue_address TEXT,
ADD COLUMN IF NOT EXISTS rescue_suburb TEXT,
ADD COLUMN IF NOT EXISTS rescue_postcode TEXT,
ADD COLUMN IF NOT EXISTS release_address TEXT,
ADD COLUMN IF NOT EXISTS release_suburb TEXT,
ADD COLUMN IF NOT EXISTS release_postcode TEXT;

-- Note: Carer address fields should already exist from previous migration
-- Adding them here just in case they don't exist
ALTER TABLE carers
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'NSW',
ADD COLUMN IF NOT EXISTS postcode TEXT;