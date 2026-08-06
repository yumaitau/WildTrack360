import { auth } from "@/lib/clerk-server";
import { getOrganisationInfo } from "@/lib/org-directory";
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
      const organization = await getOrganisationInfo(orgId);

      // Get jurisdiction from organisation metadata (DB or Clerk per ORG_SOURCE)
      const orgJurisdiction = organization?.jurisdiction ?? undefined;
      if (orgJurisdiction) {
        const upperJurisdiction = orgJurisdiction.toUpperCase();
        // Validate it's a valid jurisdiction
        if (['ACT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT'].includes(upperJurisdiction)) {
          jurisdiction = upperJurisdiction;
        }
      }
    } catch (error) {
      console.error('Error fetching organization jurisdiction:', error);
    }
  }

  return <ComplianceOverviewClient jurisdiction={jurisdiction} organizationId={orgId || ''} />;
}