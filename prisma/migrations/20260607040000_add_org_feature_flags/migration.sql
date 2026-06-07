-- Per-org rollout switch. The WildTrack360-Admin app writes rows here to flip
-- features on for specific orgs. Default policy: a missing row means OFF, so
-- any newly-introduced feature stays dark until explicitly enabled per org.

CREATE TABLE "public"."org_feature_flags" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "org_feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_feature_flags_clerk_organization_id_feature_key"
  ON "public"."org_feature_flags"("clerk_organization_id", "feature");
CREATE INDEX "org_feature_flags_clerk_organization_id_idx"
  ON "public"."org_feature_flags"("clerk_organization_id");
