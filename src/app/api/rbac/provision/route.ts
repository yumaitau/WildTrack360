import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/rbac/provision — self-provision an existing Clerk org:admin
 * as an ADMIN in the new WildTrack360 RBAC system.
 *
 * Only allowed when:
 *  1. The user has NO existing OrgMember record (unmigrated)
 *  2. The user holds the Clerk org:admin role in this organisation
 */
export async function POST() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if already migrated
    const existing = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Role already provisioned' },
        { status: 409 }
      );
    }

    // Verify the user is a Clerk org:admin
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    const membership = memberships.data.find(
      (m: any) => m.organization.id === orgId
    );

    if (membership?.role !== 'org:admin') {
      return NextResponse.json(
        { error: 'Only organisation admins can self-provision' },
        { status: 403 }
      );
    }

    // Create the OrgMember record as ADMIN
    const member = await prisma.orgMember.create({
      data: {
        userId,
        orgId,
        role: 'ADMIN',
      },
    });

    logAudit({ userId, orgId, action: 'CREATE', entity: 'OrgMember', entityId: member.id, metadata: { role: 'ADMIN', selfProvisioned: true } });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error provisioning role:', error);
    return NextResponse.json(
      { error: 'Failed to provision role' },
      { status: 500 }
    );
  }
}
