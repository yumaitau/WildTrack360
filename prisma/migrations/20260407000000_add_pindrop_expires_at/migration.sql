-- AlterTable
ALTER TABLE "public"."pindrop_sessions" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "pindrop_sessions_status_idx" ON "public"."pindrop_sessions"("status");
