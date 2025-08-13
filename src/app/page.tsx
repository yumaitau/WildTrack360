import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import HomeClient from "./home-client";
import { getAnimals, getSpecies, getCarers } from "@/lib/database";
import { createOrUpdateClerkUser, createOrUpdateClerkOrganization } from "@/lib/database";

export default async function Home() {
  const { userId, orgId } = await auth();
  const user = await currentUser();
  
  if (!userId) {
    redirect("/sign-in");
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

  try {
    const [animals, species, carers] = await Promise.all([
      getAnimals(userId, organizationId),
      getSpecies(userId, organizationId),
      getCarers(userId, organizationId),
    ]);

    const showOnboarding = animals.length === 0 || species.length === 0;

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
