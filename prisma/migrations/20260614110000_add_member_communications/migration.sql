-- Member communications: org-authored news posts shown in the member portal
-- (and broadcast by email on publish), and admin → member direct messages
-- shown in the portal inbox (and optionally emailed).

CREATE TYPE "public"."NewsPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "public"."news_posts" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "public"."NewsPostStatus" NOT NULL DEFAULT 'DRAFT',
  "author_clerk_user_id" TEXT,
  "author_name" TEXT,
  "published_at" TIMESTAMP(3),
  "email_sent_at" TIMESTAMP(3),
  "recipient_count" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "news_posts_clerk_organization_id_status_published_at_idx"
  ON "public"."news_posts"("clerk_organization_id", "status", "published_at");

CREATE UNIQUE INDEX "members_id_clerk_organization_id_key"
  ON "public"."members"("id", "clerk_organization_id");

CREATE TABLE "public"."member_messages" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sent_by_clerk_user_id" TEXT,
  "sent_by_name" TEXT,
  "email_sent_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "member_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_messages_clerk_organization_id_created_at_idx"
  ON "public"."member_messages"("clerk_organization_id", "created_at");
CREATE INDEX "member_messages_member_id_read_at_idx"
  ON "public"."member_messages"("member_id", "read_at");

ALTER TABLE "public"."member_messages"
  ADD CONSTRAINT "member_messages_member_id_fkey"
  FOREIGN KEY ("member_id", "clerk_organization_id")
  REFERENCES "public"."members"("id", "clerk_organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
