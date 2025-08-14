import { getCarers } from "@/lib/database";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CarerManagementClient from "./carer-management-client";

export default async function CarerManagementPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  const organizationId = orgId || '';
  const carers = await getCarers(organizationId);

  return <CarerManagementClient carers={carers} />;
}