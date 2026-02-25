-- CreateEnum
CREATE TYPE "PindropStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LINKED', 'REVIEWED');

-- CreateTable
CREATE TABLE "pindrop_sessions" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" "PindropStatus" NOT NULL DEFAULT 'PENDING',
    "callerName" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "description" TEXT,
    "species" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "address" TEXT,
    "photoUrls" TEXT[],
    "callerNotes" TEXT,
    "userAgent" TEXT,
    "submittedAt" TIMESTAMP(3),
    "linkedAnimalId" TEXT,
    "clerkOrganizationId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pindrop_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pindrop_sessions_accessToken_key" ON "pindrop_sessions"("accessToken");
CREATE INDEX "pindrop_sessions_accessToken_idx" ON "pindrop_sessions"("accessToken");
CREATE INDEX "pindrop_sessions_clerkOrganizationId_idx" ON "pindrop_sessions"("clerkOrganizationId");

-- AddForeignKey
ALTER TABLE "pindrop_sessions" ADD CONSTRAINT "pindrop_sessions_linkedAnimalId_fkey" FOREIGN KEY ("linkedAnimalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
