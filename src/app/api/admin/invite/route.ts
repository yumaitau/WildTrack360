import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/rbac";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(userId, orgId);
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { emailAddress } = await request.json();
  if (!emailAddress) {
    return NextResponse.json({ error: "Email address is required" }, { status: 400 });
  }

  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({ organizationId: orgId });
  const orgUrl = (org.publicMetadata as Record<string, unknown>)?.org_url as string | undefined;

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const redirectUrl = orgUrl
    ? `${protocol}://${orgUrl}.${ROOT_DOMAIN}/`
    : `${protocol}://${ROOT_DOMAIN}/`;

  const invitation = await clerk.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress,
    role: "org:member",
    inviterUserId: userId,
    redirectUrl,
  });

  return NextResponse.json({ id: invitation.id });
}
