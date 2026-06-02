-- Saved custom reporting queries. Each row stores a single line of the safe,
-- read-only reporting QL (never SQL), scoped to one Clerk organisation.
CREATE TABLE "public"."saved_report_queries" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "visualization" TEXT NOT NULL DEFAULT 'table',
  "show_on_dashboard" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "saved_report_queries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_report_queries_org_id_idx"
  ON "public"."saved_report_queries"("org_id");

CREATE INDEX "saved_report_queries_org_id_show_on_dashboard_idx"
  ON "public"."saved_report_queries"("org_id", "show_on_dashboard");
