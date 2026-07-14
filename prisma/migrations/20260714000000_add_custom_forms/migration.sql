-- Custom Forms (ported from WildForm360): org-defined data-collection forms
-- with immutable version snapshots and offline-syncable submissions.

CREATE TYPE "CustomFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "custom_forms" (
    "id" TEXT NOT NULL,
    "clerk_organization_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CustomFormStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "definition_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_forms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_form_versions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "clerk_organization_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "change_summary" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CustomFormStatus" NOT NULL,
    "definition_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_form_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_form_submissions" (
    "id" TEXT NOT NULL,
    "clerk_organization_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "form_version_id" TEXT,
    "form_version_number" INTEGER NOT NULL,
    "submitted_by_user_id" TEXT NOT NULL,
    "client_submission_id" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_accuracy_meters" DOUBLE PRECISION,
    "photo_urls" JSONB NOT NULL DEFAULT '[]',
    "weather_json" JSONB,
    "values_json" JSONB NOT NULL,
    "notes" TEXT,
    "device_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_forms_clerk_organization_id_slug_key" ON "custom_forms"("clerk_organization_id", "slug");
CREATE INDEX "custom_forms_clerk_organization_id_status_idx" ON "custom_forms"("clerk_organization_id", "status");

CREATE UNIQUE INDEX "custom_form_versions_form_id_version_key" ON "custom_form_versions"("form_id", "version");
CREATE INDEX "custom_form_versions_clerk_organization_id_idx" ON "custom_form_versions"("clerk_organization_id");

-- Offline sync idempotency: retried mobile syncs with the same client id must
-- not duplicate rows. Postgres treats NULLs as distinct, so web submissions
-- without a client id are unaffected.
CREATE UNIQUE INDEX "custom_form_submissions_clerk_organization_id_submitted_by_key" ON "custom_form_submissions"("clerk_organization_id", "submitted_by_user_id", "client_submission_id");
CREATE INDEX "custom_form_submissions_clerk_organization_id_form_id_idx" ON "custom_form_submissions"("clerk_organization_id", "form_id");
CREATE INDEX "custom_form_submissions_form_id_observed_at_idx" ON "custom_form_submissions"("form_id", "observed_at");
CREATE INDEX "custom_form_submissions_clerk_organization_id_submitted_by_idx" ON "custom_form_submissions"("clerk_organization_id", "submitted_by_user_id");

ALTER TABLE "custom_form_versions" ADD CONSTRAINT "custom_form_versions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "custom_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_form_submissions" ADD CONSTRAINT "custom_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "custom_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_form_submissions" ADD CONSTRAINT "custom_form_submissions_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "custom_form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
