-- Membership lifecycle email idempotency. One row per (membership, kind) marks
-- that a given renewal/lapse/win-back email has been sent, so the daily sweep
-- never double-sends.

CREATE TYPE "public"."MembershipNotificationKind" AS ENUM (
  'RENEWAL_30', 'RENEWAL_7', 'RENEWAL_1', 'LAPSED', 'WINBACK_30', 'WINBACK_90'
);

CREATE TABLE "public"."membership_notifications" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "membership_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "kind" "public"."MembershipNotificationKind" NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "membership_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memberships_id_clerk_organization_id_key"
  ON "public"."memberships"("id", "clerk_organization_id");

CREATE UNIQUE INDEX "membership_notifications_membership_id_kind_key"
  ON "public"."membership_notifications"("membership_id", "kind");
CREATE INDEX "membership_notifications_clerk_organization_id_sent_at_idx"
  ON "public"."membership_notifications"("clerk_organization_id", "sent_at");

ALTER TABLE "public"."membership_notifications"
  ADD CONSTRAINT "membership_notifications_membership_id_fkey"
  FOREIGN KEY ("membership_id", "clerk_organization_id")
  REFERENCES "public"."memberships"("id", "clerk_organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."membership_notifications"
  ADD CONSTRAINT "membership_notifications_member_id_fkey"
  FOREIGN KEY ("member_id", "clerk_organization_id")
  REFERENCES "public"."members"("id", "clerk_organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
