-- CreateTable
CREATE TABLE "public"."post_release_monitoring" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "location" TEXT,
    "coordinates" JSONB,
    "animal_condition" TEXT,
    "notes" TEXT NOT NULL,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "post_release_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_release_monitoring_animalId_idx" ON "public"."post_release_monitoring"("animalId");

-- CreateIndex
CREATE INDEX "post_release_monitoring_clerkOrganizationId_idx" ON "public"."post_release_monitoring"("clerkOrganizationId");

-- AddForeignKey
ALTER TABLE "public"."post_release_monitoring" ADD CONSTRAINT "post_release_monitoring_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
