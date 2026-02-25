/*
  Warnings:

  - You are about to drop the `pindrop_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."pindrop_sessions" DROP CONSTRAINT "pindrop_sessions_linkedAnimalId_fkey";

-- DropTable
DROP TABLE "public"."pindrop_sessions";

-- DropEnum
DROP TYPE "public"."PindropStatus";
