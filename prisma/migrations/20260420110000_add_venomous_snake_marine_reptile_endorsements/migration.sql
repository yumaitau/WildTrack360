-- Add two NSW member-register endorsement columns on CarerProfile.
-- NSW's Register of Members requires a Yes/No column for each of five
-- species endorsements: Koala, Flying-Fox, Bird of Prey, Venomous Snake,
-- Marine Reptiles. The first three already exist; this migration adds
-- the last two.

ALTER TABLE "carers"
  ADD COLUMN IF NOT EXISTS "rehabilitates_venomous_snake" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rehabilitates_marine_reptile" BOOLEAN NOT NULL DEFAULT false;
