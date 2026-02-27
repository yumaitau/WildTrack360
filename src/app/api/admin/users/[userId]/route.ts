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

    // Clean up database records before deleting the Clerk user.
    // Unlink animals so they aren't orphaned.
    await prisma.animal.updateMany({
      where: { carerId: targetUserId },
      data: { carerId: null },
    });

    // Delete OrgMember (cascades CoordinatorSpeciesAssignment)
    await prisma.orgMember.deleteMany({
      where: { userId: targetUserId, orgId },
    });

    // Delete CarerProfile (cascades CarerTraining)
    await prisma.carerProfile.deleteMany({
      where: { id: targetUserId },
    });

    // Delete the Clerk user entirely
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
