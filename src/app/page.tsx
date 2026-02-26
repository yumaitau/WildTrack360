import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HomeClient from "./home-client";
import { getSpecies } from "@/lib/database";
import { createOrUpdateClerkUser, createOrUpdateClerkOrganization } from "@/lib/database";
import { getEnrichedCarers } from "@/lib/carer-helpers";
import { prisma } from "@/lib/prisma";
import { getUserRole, getAuthorisedSpecies, getOrgMember } from "@/lib/rbac";
import { extractSubdomain } from "@/lib/subdomain";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export default async function Home() {
  const { userId, orgId } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect("/landing");
  }

  // If user is on the root domain but has an active org, redirect to their tenant subdomain
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);

  if (!subdomain && orgId) {
    try {
      const clerk = await clerkClient();
      const org = await clerk.organizations.getOrganization({ organizationId: orgId });
      const orgUrl = (org.publicMetadata as Record<string, unknown>)?.org_url as string | undefined;
      if (orgUrl) {
        const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
        redirect(`${protocol}://${orgUrl}.${ROOT_DOMAIN}/`);
      }
    } catch (error) {
      // Re-throw Next.js redirect (it throws a special error internally)
      const digest = error instanceof Error && "digest" in error ? (error as { digest: string }).digest : "";
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      console.error("Failed to look up org for subdomain redirect:", error);
    }
  }

  // Use the active Clerk organization
  const organizationId = orgId || "";

  // Sync Clerk user data with our database
  if (user) {
    await createOrUpdateClerkUser({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      imageUrl: user.imageUrl || undefined,
    });
  }

  // Redirect unmigrated users (no OrgMember record) to the role setup page
  if (organizationId) {
    const member = await getOrgMember(userId, organizationId);
    if (!member) {
      redirect("/setup-role");
    }
  }

  try {
    // RBAC-filtered animal fetch: respect the user's role
    const role = await getUserRole(userId, organizationId);
    let animalsPromise;

    if (role === 'ADMIN') {
      animalsPromise = prisma.animal.findMany({
        where: { clerkOrganizationId: organizationId },
        include: { carer: true, records: true, photos: true },
        orderBy: { dateFound: 'desc' },
      });
    } else if (role === 'COORDINATOR') {
      const authorisedSpecies = await getAuthorisedSpecies(userId, organizationId);
      animalsPromise = prisma.animal.findMany({
        where: {
          clerkOrganizationId: organizationId,
          OR: [
            ...(authorisedSpecies && authorisedSpecies.length > 0
              ? [{ species: { in: authorisedSpecies } }]
              : []),
            { carerId: userId },
          ],
        },
        include: { carer: true, records: true, photos: true },
        orderBy: { dateFound: 'desc' },
      });
    } else {
      // CARER: only animals assigned to them
      animalsPromise = prisma.animal.findMany({
        where: {
          clerkOrganizationId: organizationId,
          carerId: userId,
        },
        include: { carer: true, records: true, photos: true },
        orderBy: { dateFound: 'desc' },
      });
    }

    const [animals, species, carers] = await Promise.all([
      animalsPromise,
      getSpecies(organizationId),
      getEnrichedCarers(organizationId),
    ]);

    const showOnboarding = role === 'ADMIN' && species.length === 0;

    return (
      <>
        {showOnboarding && (
          <div className="w-full text-white" style={{ backgroundColor: '#00768d' }}>
            <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
              <div className="text-sm md:text-base font-medium">
                No species found. Add your first species to get started.
              </div>
              <a
                href="/admin"
                className="inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 hover:bg-white/20 transition"
              >
                Go to Admin
              </a>
            </div>
          </div>
        )}
        <HomeClient
          initialAnimals={animals}
          species={species}
          carers={carers}
        />
      </>
    );
  } catch (error) {
    console.error('Error loading initial data:', error);
    return (
      <HomeClient
        initialAnimals={[]}
        species={[]}
        carers={[]}
      />
    );
  }
}
