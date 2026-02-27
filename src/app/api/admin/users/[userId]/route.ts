import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: callerUserId, orgId } = await auth();
  const { userId: targetUserId } = await params;

  if (!callerUserId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (callerUserId === targetUserId) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    );
  }

  const role = await getUserRole(callerUserId, orgId);
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const clerk = await clerkClient();

    // Clean up all database records atomically before deleting the Clerk user.
    await prisma.$transaction([
      // Unlink animals so they aren't orphaned.
      prisma.animal.updateMany({
        where: { carerId: targetUserId },
        data: { carerId: null },
      }),
      // Delete OrgMember across all orgs (cascades CoordinatorSpeciesAssignment)
      prisma.orgMember.deleteMany({
        where: { userId: targetUserId },
      }),
      // Delete CarerProfile (cascades CarerTraining)
      prisma.carerProfile.deleteMany({
        where: { id: targetUserId },
      }),
    ]);

    // Delete the Clerk user entirely (only after DB cleanup succeeds)
    await clerk.users.deleteUser(targetUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
