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
    where: { id: id, clerkUserId: userId, clerkOrganizationId: organizationId },
    include: { carer: true },
  });
  if (!animal) notFound();

  const [records, photos, releaseChecklist] = await Promise.all([
    prisma.record.findMany({
      where: { animalId: id, clerkUserId: userId, clerkOrganizationId: organizationId },
      orderBy: { date: "desc" },
    }),
    prisma.photo.findMany({
      where: { animalId: id, clerkUserId: userId, clerkOrganizationId: organizationId },
      orderBy: { date: "desc" },
    }),
    prisma.releaseChecklist.findFirst({
      where: { animalId: id, clerkUserId: userId, clerkOrganizationId: organizationId },
      orderBy: { releaseDate: "desc" },
    }),
  ]);

  return (
    <AnimalDetailClient
      initialAnimal={animal}
      initialRecords={records}
      initialPhotos={photos}
      releaseChecklist={releaseChecklist}
    />
  );
}
