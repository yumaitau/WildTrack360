import { auth } from "@/lib/clerk-server";
import { redirect } from "next/navigation";
import { getEnrichedCarers } from "@/lib/carer-helpers";
import { getUserRole, hasPermission } from "@/lib/rbac";
import type { EnrichedCarer } from "@/lib/types";
import CarerContactReportClient, { type ContactReportCarer } from "./report-client";

export const metadata = {
  title: "Carer Contact Report - WildTrack360",
};

export default async function CarerContactReportPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) throw new Error("Organization ID is required");

  const role = await getUserRole(userId, orgId);
  if (!hasPermission(role, "user:manage") && !hasPermission(role, "carer:view_workload")) {
    redirect("/unauthorized");
  }

  let carers: EnrichedCarer[];
  try {
    carers = await getEnrichedCarers(orgId);
  } catch (error) {
    console.error("Error loading carer contact report:", error);
    throw new Error("Unable to load carer contact report. Please try again later.");
  }

  const reportCarers: ContactReportCarer[] = carers.map((carer) => ({
    id: carer.id,
    name: carer.name,
    email: carer.email,
    phone: carer.phone,
    streetAddress: carer.streetAddress,
    suburb: carer.suburb,
    state: carer.state,
    postcode: carer.postcode,
    licenseNumber: carer.licenseNumber,
    licenseExpiry: carer.licenseExpiry?.toISOString() ?? null,
    specialties: carer.specialties,
    memberSince: carer.memberSince?.toISOString() ?? null,
    active: carer.active,
    hasProfile: carer.hasProfile,
  }));

  return <CarerContactReportClient carers={reportCarers} />;
}
