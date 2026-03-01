import { notFound, redirect } from "next/navigation";
import AnimalDetailClient from "./animal-detail-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export default async function AnimalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  const organizationId = orgId || "";

  const animal = await prisma.animal.findFirst({
    where: { id: id, clerkOrganizationId: organizationId },
    include: { carer: true },
  });
  if (!animal) notFound();

  const [records, photos, releaseChecklist, activeReminders] = await Promise.all([
    prisma.record.findMany({
      where: { animalId: id, clerkOrganizationId: organizationId },
      orderBy: { date: "desc" },
    }),
    prisma.photo.findMany({
      where: { animalId: id, clerkOrganizationId: organizationId },
      orderBy: { date: "desc" },
    }),
    prisma.releaseChecklist.findFirst({
      where: { animalId: id, clerkOrganizationId: organizationId },
      orderBy: { releaseDate: "desc" },
    }),
    prisma.animalReminder.findMany({
      where: {
        animalId: id,
        clerkOrganizationId: organizationId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Resolve Clerk user IDs to display names for the record timeline
  const uniqueUserIds = [...new Set(records.map((r) => r.clerkUserId).filter(Boolean))];
  const userMap: Record<string, string> = {};
  if (uniqueUserIds.length > 0) {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const user = await client.users.getUser(uid);
          userMap[uid] = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.emailAddresses?.[0]?.emailAddress || "Unknown";
        } catch {
          userMap[uid] = "Unknown";
        }
      })
    );
  }

  return (
    <AnimalDetailClient
      initialAnimal={animal}
      initialRecords={records}
      initialPhotos={photos}
      releaseChecklist={releaseChecklist}
      userMap={userMap}
      initialReminders={activeReminders}
      currentUserId={userId}
    />
  );
}
