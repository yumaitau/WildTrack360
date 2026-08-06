import { auth } from '@/lib/clerk-server';
import { clerkClient } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isDbOrg } from '@/lib/org-source';
import SetupRoleClient from './setup-role-client';

export default async function SetupRolePage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect('/landing');
  }

  if (!orgId) {
    redirect('/landing');
  }

  // Database-managed orgs (DB_ORG_SOURCE flag) create every member's
  // OrgMember row at invite time, so the Clerk-role self-provision flow is
  // obsolete for them (issue #56 Phase 3).
  if (await isDbOrg(orgId)) {
    redirect('/');
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
