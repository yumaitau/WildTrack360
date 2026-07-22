import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { isDbOrgSource } from '@/lib/org-source';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { route } from '@/lib/openapi/route';
import { provisionRoleContract } from '../openapi';

export const POST = route(provisionRoleContract, async () => {
  // In db org mode membership rows are created at invite time; Clerk roles no
  // longer grant anything, so self-provisioning is disabled (issue #56).
  if (isDbOrgSource()) {
    return NextResponse.json(
      { error: 'Self-provisioning is disabled: organisation roles are managed in WildTrack360' },
      { status: 403 }
    );
  }

  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Role already provisioned' }, { status: 409 });
    }

    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    const membership = memberships.data.find(
      (m: { organization: { id: string }; role: string }) => m.organization.id === orgId
    );

    if (membership?.role !== 'org:admin') {
      return NextResponse.json({ error: 'Only organisation admins can self-provision' }, { status: 403 });
    }

    const member = await prisma.orgMember.create({
      data: { userId, orgId, role: 'ADMIN' },
    });

    logAudit({ userId, orgId, action: 'CREATE', entity: 'OrgMember', entityId: member.id, metadata: { role: 'ADMIN', selfProvisioned: true } });
    return { data: member, status: 201 as const };
  } catch (error) {
    console.error('Error provisioning role:', error);
    return NextResponse.json({ error: 'Failed to provision role' }, { status: 500 });
  }
});
