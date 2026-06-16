-- Household (family) memberships: a member can be a secondary member covered by
-- a primary member's membership. Gifted/complimentary memberships record the giver.
ALTER TABLE "public"."members" ADD COLUMN "primary_member_id" TEXT;
ALTER TABLE "public"."memberships" ADD COLUMN "gifted_by" TEXT;

CREATE INDEX "members_primary_member_id_idx" ON "public"."members"("primary_member_id");

ALTER TABLE "public"."members"
  ADD CONSTRAINT "members_primary_member_id_fkey"
  FOREIGN KEY ("primary_member_id", "clerk_organization_id")
  REFERENCES "public"."members"("id", "clerk_organization_id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "public"."members"
  ADD CONSTRAINT "members_primary_member_id_not_self"
  CHECK ("primary_member_id" IS NULL OR "primary_member_id" <> "id");
