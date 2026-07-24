-- Issue #56 Phase 1: DB-managed Organisation + User tables.
-- Clerk remains authoritative until ORG_SOURCE=db; these tables are backfilled
-- by scripts/backfill-orgs-from-clerk.ts and kept fresh by the Clerk webhook.

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Seed placeholder rows from existing org_members so the foreign keys below
-- can be added on an already-populated table. The Clerk backfill script
-- (scripts/backfill-orgs-from-clerk.ts) replaces placeholder names/slugs with
-- real Clerk data; until then the placeholder slug is the org id itself, which
-- is unique and never collides with a real subdomain slug.
INSERT INTO "organisations" ("id", "name", "slug", "updatedAt")
SELECT DISTINCT "orgId", "orgId", "orgId", CURRENT_TIMESTAMP
FROM "org_members"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "users" ("id", "updatedAt")
SELECT DISTINCT "userId", CURRENT_TIMESTAMP
FROM "org_members"
ON CONFLICT ("id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
