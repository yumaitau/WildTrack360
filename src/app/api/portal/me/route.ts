import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import type { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { getPortalMember, pickPortalEditable } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { route } from '@/lib/openapi/route';
import { getPortalMeContract, updatePortalMeContract } from './openapi';

function serialize(member: Awaited<ReturnType<typeof getPortalMember>>) {
  if (!member) return null;
  const { member: m } = member;
  return {
    id: m.id,
    email: m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    phone: m.phone,
    addressLine1: m.addressLine1,
    addressLine2: m.addressLine2,
    suburb: m.suburb,
    state: m.state,
    postcode: m.postcode,
    country: m.country,
    memberNumber: m.memberNumber,
    status: m.status,
    joinedAt: m.joinedAt.toISOString(),
    clerkOrganizationId: m.clerkOrganizationId,
    customFieldsJson: m.customFieldsJson,
  };
}

export const GET = route(getPortalMeContract, async () => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  return { data: serialize(session) };
});

export const PATCH = route(updatePortalMeContract, async ({ body }) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  try {
    const patch = pickPortalEditable(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
    }
    const data: Prisma.MemberUpdateInput = {};
    if (patch.firstName !== undefined && patch.firstName !== null) data.firstName = patch.firstName;
    if (patch.lastName !== undefined && patch.lastName !== null) data.lastName = patch.lastName;
    if (patch.phone !== undefined) data.phone = patch.phone;
    if (patch.addressLine1 !== undefined) data.addressLine1 = patch.addressLine1;
    if (patch.addressLine2 !== undefined) data.addressLine2 = patch.addressLine2;
    if (patch.suburb !== undefined) data.suburb = patch.suburb;
    if (patch.state !== undefined) data.state = patch.state;
    if (patch.postcode !== undefined) data.postcode = patch.postcode;
    if (patch.country !== undefined && patch.country !== null) data.country = patch.country;
    const updated = await prisma.member.update({
      where: { id: session.member.id },
      data,
    });
    logAudit({
      userId,
      orgId: session.member.clerkOrganizationId,
      action: 'UPDATE',
      entity: 'Member',
      entityId: session.member.id,
      metadata: { source: 'portal', fields: Object.keys(patch) },
    });
    return { data: serialize({ member: updated, email: session.email }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
