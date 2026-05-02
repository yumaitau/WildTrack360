import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AnimalStatus, RecordType } from "@prisma/client";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEnrichedCarers } from "@/lib/carer-helpers";
import { prisma } from "@/lib/prisma";
import { getAuthorisedSpecies, getUserRole } from "@/lib/rbac";
import FeedRosterClient, { type FeedRosterItem } from "./feed-roster-client";

export const metadata = {
  title: "Feed Roster - WildTrack360",
};

function recommendedFeedIntervalHours(animal: {
  age: string | null;
  ageClass: string | null;
  lifeStage: string | null;
  species: string;
}) {
  const text = [animal.age, animal.ageClass, animal.lifeStage, animal.species].filter(Boolean).join(" ").toLowerCase();
  if (/(pinkie|neonate|newborn|unfurred|pouch|hatchling)/.test(text)) return 3;
  if (/(joey|chick|juvenile|fledgling|young)/.test(text)) return 4;
  if (/(subadult|adult)/.test(text)) return 12;
  return 6;
}

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 3_600_000;
}

export default async function FeedRosterPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/landing");

  const role = await getUserRole(userId, orgId);
  const baseWhere = {
    clerkOrganizationId: orgId,
    status: { in: [AnimalStatus.IN_CARE, AnimalStatus.READY_FOR_RELEASE] },
  };

  let where;
  if (role === "ADMIN" || role === "COORDINATOR_ALL" || role === "CARER_ALL") {
    where = baseWhere;
  } else if (role === "COORDINATOR") {
    const authorisedSpecies = await getAuthorisedSpecies(userId, orgId);
    where = {
      ...baseWhere,
      OR: [
        ...(authorisedSpecies && authorisedSpecies.length > 0 ? [{ species: { in: authorisedSpecies } }] : []),
        { carerId: userId },
      ],
    };
  } else {
    where = { ...baseWhere, carerId: userId };
  }

  const [animals, carers] = await Promise.all([
    prisma.animal.findMany({
      where,
      include: {
        carer: true,
        records: {
          where: { type: RecordType.FEEDING },
          orderBy: { date: "desc" },
          take: 3,
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    getEnrichedCarers(orgId),
  ]);

  const carerMap = new Map(carers.map((carer) => [carer.id, carer.name]));
  const now = new Date();
  const rosterItems: FeedRosterItem[] = animals.map((animal) => {
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
      carerName: animal.carerId ? carerMap.get(animal.carerId) ?? "Assigned carer" : "Unassigned",
      lastFeedingAt: lastFeed?.date.toISOString() ?? null,
      lastFeedingNotes: lastFeed?.notes || lastFeed?.description || null,
      nextDueAt: dueAt.toISOString(),
      recommendedIntervalHours: intervalHours,
      hoursSinceLastFeed: lastFeed ? hoursBetween(lastFeed.date, now) : null,
      hoursOverdue,
      isOverdue: !lastFeed || hoursOverdue > 0,
    };
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tools">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Back to tools">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Home">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Feed Roster</h1>
          <p className="text-sm text-muted-foreground">Daily feeding status for animals currently in care.</p>
        </div>
      </div>
      <FeedRosterClient initialItems={rosterItems} />
    </div>
  );
}
