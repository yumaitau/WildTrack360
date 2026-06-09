-- AlterTable
ALTER TABLE "organisation_settings" ADD COLUMN     "org_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organisation_settings_org_url_key" ON "organisation_settings"("org_url");

