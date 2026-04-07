import { notFound, redirect } from "next/navigation";
import AnimalDetailClient from "./animal-detail-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { isOrgAdmin } from "@/lib/authz";
import { getUserRole, hasPermission, canAccessAnimal } from "@/lib/rbac";

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

  const [records, photos, releaseChecklist, activeReminders, permanentCareApplications, transfers, postReleaseRecords] = await Promise.all([
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
    prisma.permanentCareApplication.findMany({
      where: { animalId: id, clerkOrganizationId: organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.animalTransfer.findMany({
      where: { animalId: id, clerkOrganizationId: organizationId },
      orderBy: { transferDate: "desc" },
    }),
    prisma.postReleaseMonitoring.findMany({
      where: { animalId: id, clerkOrganizationId: organizationId },
      orderBy: { date: "desc" },
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

  const adminFlag = organizationId ? await isOrgAdmin(userId, organizationId) : false;

  // Compute permissions for this user
  let canManagePhotos = false;
  let canDraftPermanentCare = false;
  let canSubmitPermanentCare = false;
  let canApprovePermanentCare = false;
  let canManageTransfers = false;
  let canManagePostRelease = false;
  let canViewFullTimeline = false;
  if (organizationId) {
    const role = await getUserRole(userId, organizationId);
    if (hasPermission(role, 'animal:edit_any')) {
      canManagePhotos = await canAccessAnimal(userId, organizationId, animal);
    } else if (hasPermission(role, 'animal:edit_own')) {
      canManagePhotos = animal.carerId === userId;
    }
    canDraftPermanentCare = hasPermission(role, 'compliance:draft_permanent_care');
    canSubmitPermanentCare = hasPermission(role, 'compliance:submit_permanent_care');
    canApprovePermanentCare = hasPermission(role, 'compliance:approve_permanent_care');
    canManageTransfers = hasPermission(role, 'compliance:manage_transfers');
    canManagePostRelease = hasPermission(role, 'compliance:manage_post_release')
      || (hasPermission(role, 'animal:edit_own') && animal.carerId === userId);
    canViewFullTimeline = role === 'ADMIN' || role === 'COORDINATOR_ALL';
  }

  // Only fetch incidents for users who can view the full timeline
  const incidents = canViewFullTimeline
    ? await prisma.incidentReport.findMany({
        where: { animalId: id, clerkOrganizationId: organizationId },
        orderBy: { date: "desc" },
      })
    : [];

  return (
    <AnimalDetailClient
      initialAnimal={animal}
      initialRecords={records}
      initialPhotos={photos}
      releaseChecklist={releaseChecklist}
      userMap={userMap}
      initialReminders={activeReminders}
      currentUserId={userId}
      isAdmin={adminFlag}
      canManagePhotos={canManagePhotos}
      initialPermanentCareApplications={permanentCareApplications}
      initialTransfers={transfers}
      canDraftPermanentCare={canDraftPermanentCare}
      canSubmitPermanentCare={canSubmitPermanentCare}
      canApprovePermanentCare={canApprovePermanentCare}
      canManageTransfers={canManageTransfers}
      initialPostReleaseRecords={postReleaseRecords}
      canManagePostRelease={canManagePostRelease}
      initialIncidents={incidents}
      canViewFullTimeline={canViewFullTimeline}
    />
  );
}
