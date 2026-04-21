-- AlterTable: track inter-org transfer provenance on animals so the NSW
-- annual report can de-duplicate animals moving between rehab groups.
-- source_org_animal_id carries the originating group's unique ID; the
-- inter_org_transfer_received flag tells the report generator to emit that
-- ID instead of the receiving group's org_animal_id.
ALTER TABLE "public"."animals"
  ADD COLUMN "source_org_animal_id" TEXT,
  ADD COLUMN "inter_org_transfer_received" BOOLEAN NOT NULL DEFAULT false;

-- Enforce the invariant at the DB level: a row flagged as an inter-org
-- transfer must carry a non-blank source_org_animal_id so the NSW report can
-- emit the originating group's ID. Application-level (Zod) validation covers
-- the UI path but other writers (imports, SQL backfills) would bypass it.
ALTER TABLE "public"."animals"
  ADD CONSTRAINT "animals_transfer_source_check"
  CHECK (
    "inter_org_transfer_received" = false
    OR (
      "source_org_animal_id" IS NOT NULL
      AND btrim("source_org_animal_id") <> ''
    )
  );
