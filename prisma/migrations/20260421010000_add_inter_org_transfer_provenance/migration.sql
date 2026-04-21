-- AlterTable: track inter-org transfer provenance on animals so the NSW
-- annual report can de-duplicate animals moving between rehab groups.
-- source_org_animal_id carries the originating group's unique ID; the
-- inter_org_transfer_received flag tells the report generator to emit that
-- ID instead of the receiving group's org_animal_id.
ALTER TABLE "public"."animals"
  ADD COLUMN "source_org_animal_id" TEXT,
  ADD COLUMN "inter_org_transfer_received" BOOLEAN NOT NULL DEFAULT false;
