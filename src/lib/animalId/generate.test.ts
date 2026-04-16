import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { allocateNextSequenceValue } from "./sequence";

// Use a direct Prisma client for integration tests (no server-only guard)
const prisma = new PrismaClient();

const TEST_ORG_ID = `test-org-animalid-${Date.now()}`;
const TEST_YEAR = 2099;

async function commitAnimalIdDirect(orgId: string, year: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    return allocateNextSequenceValue(tx, orgId, year);
  });
}

describe("AnimalIdSequence concurrent commits", () => {
  afterAll(async () => {
    // Clean up test data
    await prisma.animalIdSequence.deleteMany({
      where: { clerkOrganisationId: TEST_ORG_ID },
    });
    await prisma.$disconnect();
  });

  it("20 parallel commits produce 20 distinct sequence values", async () => {
    const promises = Array.from({ length: 20 }, () =>
      commitAnimalIdDirect(TEST_ORG_ID, TEST_YEAR)
    );

    const results = await Promise.all(promises);
    const unique = new Set(results);

    expect(unique.size).toBe(20);
    // All values should be in range [1, 20]
    expect(Math.min(...results)).toBe(1);
    expect(Math.max(...results)).toBe(20);
  });
});
