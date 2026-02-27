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

  let emailAddress: string;
  try {
    const body = await request.json();
    emailAddress = body.emailAddress;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!emailAddress) {
    return NextResponse.json({ error: "Email address is required" }, { status: 400 });
  }

  try {
    const clerk = await clerkClient();
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    const orgUrl = (org.publicMetadata as Record<string, unknown>)?.org_url as string | undefined;

    const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
    const safeHostname = orgUrl && /^[a-zA-Z0-9-]+$/.test(orgUrl);
    // Point to /sign-up so the invited user lands on a public route
    // where the __clerk_ticket param is preserved and handled properly.
    const redirectUrl = safeHostname
      ? `${protocol}://${orgUrl}.${ROOT_DOMAIN}/sign-up`
      : `${protocol}://${ROOT_DOMAIN}/sign-up`;

    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role: "org:member",
      inviterUserId: userId,
      redirectUrl,
    });

    return NextResponse.json({ id: invitation.id });
  } catch (error) {
    console.error("Clerk API error during invitation:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 502 });
  }
}
