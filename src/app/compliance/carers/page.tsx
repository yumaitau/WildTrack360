import { getCarers } from "@/lib/database";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CarerManagementClient from "./carer-management-client";

export default async function CarerManagementPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  const organizationId = orgId || '';

  let carers;
  try {
    carers = await getCarers(organizationId);
  } catch (error) {
    console.error('Error loading carers:', error);
    throw new Error('Unable to load carers. Please try again later.');
  }

  return <CarerManagementClient carers={carers} />;
}