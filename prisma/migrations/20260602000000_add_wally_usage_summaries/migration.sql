-- Track Wally AI assistant usage so each organisation can be limited to a
-- fixed number of user messages per Australia/Sydney day.
CREATE TABLE "public"."wally_usage_summaries" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "date_key" TEXT NOT NULL,
  "message_count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wally_usage_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wally_usage_summaries_org_id_date_key_key"
  ON "public"."wally_usage_summaries"("org_id", "date_key");

CREATE INDEX "wally_usage_summaries_org_id_idx"
  ON "public"."wally_usage_summaries"("org_id");
