import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import HomeClient from "./home-client";
import { getSpecies } from "@/lib/database";
import { createOrUpdateClerkUser, createOrUpdateClerkOrganization } from "@/lib/database";
import { getEnrichedCarers } from "@/lib/carer-helpers";
import { prisma } from "@/lib/prisma";
import { getUserRole, getAuthorisedSpecies, getOrgMember } from "@/lib/rbac";

export default async function Home() {
  const { userId, orgId } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect("/landing");
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

    const showOnboarding = role === 'ADMIN' && (animals.length === 0 || species.length === 0);

    return (
      <>
        {showOnboarding && (
          <div className="w-full text-white" style={{ backgroundColor: '#00768d' }}>
            <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
              <div className="text-sm md:text-base font-medium">
                No {animals.length === 0 ? 'animals' : ''}{animals.length === 0 && species.length === 0 ? ' or ' : ''}{species.length === 0 ? 'species' : ''} found.
                Add your first entries to get started.
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
