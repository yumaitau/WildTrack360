-- Member→carer funnel: interest applications members submit to become volunteer
-- wildlife carers, triaged by admins.
CREATE TYPE "public"."CarerInterestStatus" AS ENUM ('NEW', 'CONTACTED', 'APPROVED', 'DECLINED');

CREATE TABLE "public"."carer_interests" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "member_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "experience" TEXT,
  "availability" TEXT,
  "message" TEXT,
  "status" "public"."CarerInterestStatus" NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "carer_interests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "carer_interests_clerk_organization_id_status_idx"
  ON "public"."carer_interests"("clerk_organization_id", "status");

ALTER TABLE "public"."carer_interests"
  ADD CONSTRAINT "carer_interests_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
