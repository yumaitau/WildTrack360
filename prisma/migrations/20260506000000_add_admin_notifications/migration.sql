-- Admin notification audit/dedupe log for transactional emails.
CREATE TABLE "public"."admin_notification_logs" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resend_message_id" TEXT,

  CONSTRAINT "admin_notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_notification_logs_org_id_user_id_kind_dedupe_key_key"
  ON "public"."admin_notification_logs"("org_id", "user_id", "kind", "dedupe_key");

CREATE INDEX "admin_notification_logs_org_id_kind_sent_at_idx"
  ON "public"."admin_notification_logs"("org_id", "kind", "sent_at");

-- Per-user dismissal state for persistent in-app admin notification banners.
CREATE TABLE "public"."admin_notification_dismissals" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "reminder_key" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_notification_dismissals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_notification_dismissals_org_id_user_id_kind_reminder_key_year_key"
  ON "public"."admin_notification_dismissals"("org_id", "user_id", "kind", "reminder_key", "year");

CREATE INDEX "admin_notification_dismissals_org_id_kind_year_idx"
  ON "public"."admin_notification_dismissals"("org_id", "kind", "year");
