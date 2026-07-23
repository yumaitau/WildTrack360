-- Extend feature flags with an optional integer value. Existing boolean
-- feature rows remain unchanged; ORG_SEAT uses this column for the per-org
-- member limit.
ALTER TABLE "org_feature_flags"
ADD COLUMN "value_int" INTEGER;
