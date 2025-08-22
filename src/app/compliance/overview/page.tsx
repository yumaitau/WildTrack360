import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ComplianceOverviewClient from "./compliance-overview-client";

export default async function ComplianceOverviewPage() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect("/landing");
  }

  // Get the organization's jurisdiction from server-side
  let jurisdiction = 'ACT'; // Default
  
  if (orgId) {
    try {
      const organization = await clerkClient().organizations.getOrganization({
        organizationId: orgId,
      });
      
      // Get jurisdiction from organization metadata
      const orgJurisdiction = organization.publicMetadata?.jurisdiction as string | undefined;
      if (orgJurisdiction) {
        const upperJurisdiction = orgJurisdiction.toUpperCase();
        // Validate it's a valid jurisdiction
        if (['ACT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT'].includes(upperJurisdiction)) {
          jurisdiction = upperJurisdiction;
        }
      }
      console.log(`Compliance page - Organization ${orgId} jurisdiction: ${jurisdiction}`);
    } catch (error) {
      console.error('Error fetching organization jurisdiction:', error);
    }
  } else {
    console.log('Compliance page - No organization ID, using default jurisdiction: ACT');
  }

  return <ComplianceOverviewClient jurisdiction={jurisdiction} organizationId={orgId || ''} />;
}