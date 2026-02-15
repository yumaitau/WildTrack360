import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SetupRoleClient from './setup-role-client';

export default async function SetupRolePage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect('/landing');
  }

  if (!orgId) {
    redirect('/landing');
  }

  // If the user already has an OrgMember record, they're migrated — send them home
  const existing = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (existing) {
    redirect('/');
  }

  // Determine the user's Clerk role in this org
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  const membership = memberships.data.find(
    (m: any) => m.organization.id === orgId
  );
  const clerkRole = membership?.role ?? 'org:member';
  const isClerkAdmin = clerkRole === 'org:admin';
  const orgName = membership?.organization?.name ?? 'your organisation';

  return (
    <SetupRoleClient isClerkAdmin={isClerkAdmin} orgName={orgName} />
  );
}
