-- Soft delete for care records. WildTrack360 is an immutable ledger: records are
-- never hard-deleted. A deleted record is hidden from the UI but retained in the
-- database and data exports, flagged with who deleted it and when.
ALTER TABLE "records" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "records" ADD COLUMN "deletedBy" TEXT;

-- Speeds up the common "active records for an animal" query (deletedAt IS NULL).
CREATE INDEX "records_animalId_deletedAt_idx" ON "records"("animalId", "deletedAt");
