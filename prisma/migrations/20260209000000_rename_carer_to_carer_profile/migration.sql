-- Rename Carer model to CarerProfile and use Clerk user ID as PK
-- The underlying table stays as "carers" via @@map

-- Drop foreign keys that reference carers.id
ALTER TABLE "animals" DROP CONSTRAINT IF EXISTS "animals_carerId_fkey";
ALTER TABLE "carer_trainings" DROP CONSTRAINT IF EXISTS "carer_trainings_carerId_fkey";
ALTER TABLE "hygiene_logs" DROP CONSTRAINT IF EXISTS "hygiene_logs_carerId_fkey";

-- Drop the old primary key
ALTER TABLE "carers" DROP CONSTRAINT "carers_pkey";

-- Drop columns no longer needed
ALTER TABLE "carers" DROP COLUMN IF EXISTS "name";
ALTER TABLE "carers" DROP COLUMN IF EXISTS "email";
ALTER TABLE "carers" DROP COLUMN IF EXISTS "clerkUserId";

-- Re-add primary key
ALTER TABLE "carers" ADD CONSTRAINT "carers_pkey" PRIMARY KEY ("id");

-- Drop the default on id (was cuid(), no longer needed)
ALTER TABLE "carers" ALTER COLUMN "id" DROP DEFAULT;

-- Re-add foreign keys
ALTER TABLE "animals" ADD CONSTRAINT "animals_carerId_fkey"
  FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carer_trainings" ADD CONSTRAINT "carer_trainings_carerId_fkey"
  FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hygiene_logs" ADD CONSTRAINT "hygiene_logs_carerId_fkey"
  FOREIGN KEY ("carerId") REFERENCES "carers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
