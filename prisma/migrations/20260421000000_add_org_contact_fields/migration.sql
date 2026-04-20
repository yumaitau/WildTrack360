-- AlterTable: add contact email, contact phone, and licence number to organisation settings
ALTER TABLE "public"."organisation_settings" ADD COLUMN "contact_email" TEXT;
ALTER TABLE "public"."organisation_settings" ADD COLUMN "contact_phone" TEXT;
ALTER TABLE "public"."organisation_settings" ADD COLUMN "license_number" TEXT;
