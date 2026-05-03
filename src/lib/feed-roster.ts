import { AnimalStatus, OrgRole, Prisma, RecordType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthorisedSpecies } from "@/lib/rbac";

export interface FeedRosterItem {
  id: string;
  name: string;
  species: string;
  age: string | null;
  ageClass: string | null;
  status: string;
  carerId: string | null;
  carerName: string;
  lastFeedingAt: string | null;
  lastFeedingNotes: string | null;
  nextDueAt: string;
  recommendedIntervalHours: number;
  hoursSinceLastFeed: number | null;
  hoursOverdue: number;
  isOverdue: boolean;
}

function recommendedFeedIntervalHours(animal: {
  age: string | null;
  ageClass: string | null;
  lifeStage: string | null;
  species: string;
}) {
  const text = [animal.age, animal.ageClass, animal.lifeStage, animal.species]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(pinkie|neonate|newborn|unfurred|pouch|hatchling)/.test(text)) return 3;
  if (/(joey|chick|juvenile|fledgling|young)/.test(text)) return 4;
  if (/(subadult|adult)/.test(text)) return 12;
  return 6;
}

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 3_600_000;
}

export async function buildFeedRosterWhere(
  role: OrgRole,
  userId: string,
  orgId: string,
): Promise<Prisma.AnimalWhereInput> {
  const baseWhere: Prisma.AnimalWhereInput = {
    clerkOrganizationId: orgId,
    status: { in: [AnimalStatus.IN_CARE, AnimalStatus.READY_FOR_RELEASE] },
  };

  if (role === "ADMIN" || role === "COORDINATOR_ALL" || role === "CARER_ALL") {
    return baseWhere;
  }
  if (role === "COORDINATOR") {
    const authorisedSpecies = await getAuthorisedSpecies(userId, orgId);
    return {
      ...baseWhere,
      OR: [
        ...(authorisedSpecies && authorisedSpecies.length > 0
          ? [{ species: { in: authorisedSpecies } }]
          : []),
        { carerId: userId },
      ],
    };
  }
  return { ...baseWhere, carerId: userId };
}

export async function fetchFeedRosterItems(
  role: OrgRole,
  userId: string,
  orgId: string,
  carerNameById: Map<string, string>,
): Promise<FeedRosterItem[]> {
  const where = await buildFeedRosterWhere(role, userId, orgId);

  const animals = await prisma.animal.findMany({
    where,
    include: {
      records: {
        where: { type: RecordType.FEEDING },
        orderBy: { date: "desc" },
        take: 3,
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const now = new Date();
  return animals.map((animal) => {
    const lastFeed = animal.records[0] ?? null;
    const previousFeed = animal.records[1] ?? null;
    const derivedInterval =
      lastFeed && previousFeed
        ? Math.max(2, Math.min(24, Math.round(Math.abs(hoursBetween(previousFeed.date, lastFeed.date)))))
        : null;
    const intervalHours = derivedInterval ?? recommendedFeedIntervalHours(animal);
    const dueAt = lastFeed ? new Date(lastFeed.date.getTime() + intervalHours * 3_600_000) : now;
    const hoursOverdue = hoursBetween(dueAt, now);

    return {
      id: animal.id,
      name: animal.name,
      species: animal.species,
      age: animal.age,
      ageClass: animal.ageClass,
      status: animal.status,
      carerId: animal.carerId,
      carerName: animal.carerId ? carerNameById.get(animal.carerId) ?? "Assigned carer" : "Unassigned",
      lastFeedingAt: lastFeed?.date.toISOString() ?? null,
      lastFeedingNotes: lastFeed?.notes || lastFeed?.description || null,
      nextDueAt: dueAt.toISOString(),
      recommendedIntervalHours: intervalHours,
      hoursSinceLastFeed: lastFeed ? hoursBetween(lastFeed.date, now) : null,
      hoursOverdue,
      isOverdue: !lastFeed || hoursOverdue > 0,
    };
  });
}
