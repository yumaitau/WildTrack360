import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { getConnection } from '@/lib/square/oauth';
import { route } from '@/lib/openapi/route';
import { getSquareConfigContract } from './openapi';

export const GET = route(getSquareConfigContract, async () => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });

  const conn = await getConnection(session.member.clerkOrganizationId);
  if (!conn || conn.revokedAt) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  const applicationId =
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? process.env.SQUARE_APPLICATION_ID ?? null;
  if (!applicationId) {
    return NextResponse.json({ error: 'Square application id not configured' }, { status: 503 });
  }

  return { data: { applicationId, locationId: conn.locationId } };
});
