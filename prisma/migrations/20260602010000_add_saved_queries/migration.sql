-- Saved custom-QL reports. Organisation-scoped; query text is safe-QL (never SQL)
-- and is re-validated against the allowlist on every execution.
CREATE TABLE "public"."saved_queries" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "query_text" TEXT NOT NULL,
  "chart_type" TEXT NOT NULL DEFAULT 'table',
  "show_on_dashboard" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,

  CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_queries_clerk_organization_id_idx"
  ON "public"."saved_queries"("clerk_organization_id");

CREATE INDEX "saved_queries_clerk_organization_id_show_on_dashboard_idx"
  ON "public"."saved_queries"("clerk_organization_id", "show_on_dashboard");
