import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Use a direct Prisma client for integration tests (no server-only guard)
const prisma = new PrismaClient();

const TEST_ORG_ID = `test-org-animalid-${Date.now()}`;
const TEST_YEAR = 2099;

// We can't import the server-only generate.ts directly in vitest,
// so we inline the core logic for the integration test.
async function commitAnimalIdDirect(orgId: string, year: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const seqRow = await tx.animalIdSequence.upsert({
      where: {
        clerkOrganisationId_year: { clerkOrganisationId: orgId, year },
      },
      create: {
        clerkOrganisationId: orgId,
        year,
        nextValue: 2,
      },
      update: {
        nextValue: { increment: 1 },
      },
    });
    return seqRow.nextValue - 1;
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
