-- Generic custom-field template primitive ported from RangerOS. First consumer
-- is Member (Member.custom_fields_json holds values keyed by FormTemplate field
-- id), but the polymorphic entity_type column makes the same template + value
-- shape reusable for future entities (donor surveys, intake forms, etc.).

CREATE TYPE "public"."FormEntityType" AS ENUM ('MEMBER');

CREATE TABLE "public"."form_templates" (
  "id" TEXT NOT NULL,
  "clerk_organization_id" TEXT NOT NULL,
  "entity_type" "public"."FormEntityType" NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "fields_json" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_templates_clerk_organization_id_entity_type_key"
  ON "public"."form_templates"("clerk_organization_id", "entity_type");
CREATE INDEX "form_templates_clerk_organization_id_idx"
  ON "public"."form_templates"("clerk_organization_id");
