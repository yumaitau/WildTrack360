-- CreateTable
CREATE TABLE "square_oauth_states" (
    "state" TEXT NOT NULL,
    "clerk_organization_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "square_oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "square_oauth_states_expires_at_idx" ON "square_oauth_states"("expires_at");

