import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { prisma } from '@/lib/prisma';
import {
  addHouseholdMember,
  listHouseholdMembers,
  removeHouseholdMember,
} from '@/lib/household';
import { sanitizePlainText } from '@/lib/sanitize';
import { route } from '@/lib/openapi/route';
import {
  getHouseholdContract,
  addHouseholdMemberContract,
  removeHouseholdMemberContract,
} from './openapi';

async function requirePrimary() {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const session = await getPortalMember(userId);
  if (!session) return { error: NextResponse.json({ error: 'No membership found' }, { status: 404 }) };
  if (session.member.primaryMemberId) {
    return { error: NextResponse.json({ error: 'Only the primary member manages the household' }, { status: 403 }) };
  }
  const ownActive = await prisma.membership.findFirst({
    where: { memberId: session.member.id, status: 'ACTIVE', periodEnd: { gte: new Date() } },
    select: { id: true },
  });
  if (!ownActive) {
    return { error: NextResponse.json({ error: 'An active membership is required' }, { status: 403 }) };
  }
  return { member: session.member };
}

export const GET = route(getHouseholdContract, async () => {
  const ctx = await requirePrimary();
  if (ctx.error) return ctx.error;
  const members = await listHouseholdMembers(ctx.member.clerkOrganizationId, ctx.member.id);
  return { data: { members } };
});

export const POST = route(addHouseholdMemberContract, async ({ request }) => {
  const ctx = await requirePrimary();
  if (ctx.error) return ctx.error;
  try {
    const body = (await request.json()) as { firstName?: string; lastName?: string; email?: string };
    const result = await addHouseholdMember(ctx.member.clerkOrganizationId, ctx.member, {
      firstName: sanitizePlainText(String(body.firstName ?? '')),
      lastName: sanitizePlainText(String(body.lastName ?? '')),
      email: String(body.email ?? ''),
    });
    return { data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add household member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const DELETE = route(removeHouseholdMemberContract, async ({ query }) => {
  const ctx = await requirePrimary();
  if (ctx.error) return ctx.error;
  const id = query.id;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await removeHouseholdMember(ctx.member.clerkOrganizationId, ctx.member.id, id);
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove household member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
