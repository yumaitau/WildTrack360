'server-only';

import { prisma } from "@/lib/prisma";
import { renderAnimalIdTemplate, type TemplateContext } from "./template";
import type { Prisma, PrismaClient } from "@prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

async function getOrgSettings(orgId: string) {
  return prisma.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
  });
}

function yearFromDate(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getFullYear();
}

/**
 * Preview an animal ID without incrementing the sequence.
 * Returns the rendered template using the current nextValue (or 1 if no row exists).
 */
export async function peekAnimalId(
  orgId: string,
  intakeDate: Date | string,
  species?: string
): Promise<string> {
  const settings = await getOrgSettings(orgId);
  const template = settings?.animalIdTemplate ?? "{ORG_SHORT}-{YYYY}-{seq:4}";
  const orgShortCode = settings?.orgShortCode ?? "ORG";
  const year = yearFromDate(intakeDate);

  const seqRow = await prisma.animalIdSequence.findUnique({
    where: { clerkOrganisationId_year: { clerkOrganisationId: orgId, year } },
  });

  const ctx: TemplateContext = {
    orgShortCode,
    year,
    seq: seqRow?.nextValue ?? 1,
    species,
  };

  return renderAnimalIdTemplate(template, ctx);
}

/**
 * Atomically claim the next sequence number and return the rendered animal ID.
 * Must be called inside a Prisma interactive transaction.
 */
export async function commitAnimalId(
  tx: TransactionClient,
  orgId: string,
  intakeDate: Date | string,
  species?: string
): Promise<string> {
  const settings = await tx.organisationSettings.findUnique({
    where: { clerkOrganisationId: orgId },
  });
  const template = settings?.animalIdTemplate ?? "{ORG_SHORT}-{YYYY}-{seq:4}";
  const orgShortCode = settings?.orgShortCode ?? "ORG";
  const year = yearFromDate(intakeDate);

  // Upsert + atomic increment. The unique constraint on (orgId, year)
  // guarantees only one row exists per combination.
  const seqRow = await tx.animalIdSequence.upsert({
    where: { clerkOrganisationId_year: { clerkOrganisationId: orgId, year } },
    create: {
      clerkOrganisationId: orgId,
      year,
      nextValue: 2, // We're claiming value 1, so next is 2
    },
    update: {
      nextValue: { increment: 1 },
    },
  });

  // The claimed value is (nextValue - 1) after the increment,
  // or 1 when we just created the row (nextValue is already 2).
  const claimedValue = seqRow.nextValue - 1;

  const ctx: TemplateContext = {
    orgShortCode,
    year,
    seq: claimedValue,
    species,
  };

  return renderAnimalIdTemplate(template, ctx);
}
