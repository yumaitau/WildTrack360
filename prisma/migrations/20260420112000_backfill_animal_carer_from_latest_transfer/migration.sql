-- Backfill Animal.carerId from the most recent INTERNAL_CARER transfer.
--
-- Context: prior to this release, an INTERNAL_CARER transfer recorded the
-- from/to carers on the transfer row but did not update the animal's own
-- carerId — so the NSW Detailed Report's "Rehabilitator name" column
-- resolved to whoever was originally assigned at intake, not the current
-- custodian. This migration reconciles animal.carerId against the latest
-- INTERNAL_CARER transfer's to_carer_id for each affected animal.
--
-- Idempotent: the WHERE clause skips animals whose carerId already matches
-- the latest transfer target.

UPDATE "animals" a
SET "carerId" = latest.to_carer_id
FROM (
  SELECT DISTINCT ON ("animalId")
    "animalId",
    to_carer_id
  FROM "animal_transfers"
  WHERE "transferType" = 'INTERNAL_CARER'
    AND to_carer_id IS NOT NULL
  ORDER BY "animalId", "transferDate" DESC, "createdAt" DESC
) latest
WHERE a.id = latest."animalId"
  AND (a."carerId" IS DISTINCT FROM latest.to_carer_id);
