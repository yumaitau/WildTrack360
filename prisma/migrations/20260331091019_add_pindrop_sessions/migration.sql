-- CreateEnum
CREATE TYPE "public"."PindropStatus" AS ENUM ('PENDING', 'SUBMITTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."pindrop_sessions" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" "public"."PindropStatus" NOT NULL DEFAULT 'PENDING',
    "callerName" TEXT,
    "callerEmail" TEXT,
    "callerPhone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "address" TEXT,
    "photoUrls" TEXT[],
    "callerNotes" TEXT,
    "userAgent" TEXT,
    "submittedAt" TIMESTAMP(3),
    "call_log_id" TEXT,
    "clerkOrganizationId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pindrop_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pindrop_sessions_accessToken_key" ON "public"."pindrop_sessions"("accessToken");

-- CreateIndex
CREATE INDEX "pindrop_sessions_clerkOrganizationId_idx" ON "public"."pindrop_sessions"("clerkOrganizationId");

-- CreateIndex
CREATE INDEX "pindrop_sessions_accessToken_idx" ON "public"."pindrop_sessions"("accessToken");

-- AddForeignKey
ALTER TABLE "public"."pindrop_sessions" ADD CONSTRAINT "pindrop_sessions_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
