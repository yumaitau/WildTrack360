-- CreateTable
CREATE TABLE "public"."animal_reminders" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clerkOrganizationId" TEXT NOT NULL,

    CONSTRAINT "animal_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "animal_reminders_animalId_isActive_idx" ON "public"."animal_reminders"("animalId", "isActive");

-- CreateIndex
CREATE INDEX "animal_reminders_clerkOrganizationId_idx" ON "public"."animal_reminders"("clerkOrganizationId");

-- AddForeignKey
ALTER TABLE "public"."animal_reminders" ADD CONSTRAINT "animal_reminders_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
