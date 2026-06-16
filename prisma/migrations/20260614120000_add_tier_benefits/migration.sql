-- Structured per-tier benefits: an ordered list of member-facing benefit lines
-- shown on the membership tier cards.
ALTER TABLE "public"."membership_tiers"
  ADD COLUMN "benefits_json" JSONB NOT NULL DEFAULT '[]';
