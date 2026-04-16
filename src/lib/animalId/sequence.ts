/**
 * Core sequence allocator — shared between generate.ts and tests.
 * No 'server-only' guard so it can be imported in vitest.
 */
export async function allocateNextSequenceValue(
  tx: { animalIdSequence: { upsert: Function } },
  clerkOrganisationId: string,
  year: number
): Promise<number> {
  const seqRow = await tx.animalIdSequence.upsert({
    where: {
      clerkOrganisationId_year: { clerkOrganisationId, year },
    },
    create: {
      clerkOrganisationId,
      year,
      nextValue: 2, // Claiming value 1, so next is 2
    },
    update: {
      nextValue: { increment: 1 },
    },
  });
  return seqRow.nextValue - 1;
}
