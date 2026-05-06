-- Existing branch builds created admin_notification_logs.dedupe_key with a
-- default empty string. Backfill any empty legacy rows before dropping that
-- default so omitted keys cannot collide under the unique index.
UPDATE "public"."admin_notification_logs"
SET "dedupe_key" = 'legacy:' || "id"
WHERE "dedupe_key" = '';

ALTER TABLE "public"."admin_notification_logs"
  ALTER COLUMN "dedupe_key" DROP DEFAULT;
