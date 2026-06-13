import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { getConnection } from '@/lib/square/oauth';

// Public-ish config the portal needs to initialise the Square Web Payments SDK:
// the platform application id + the member's org's Square location id. Returns
// 503 if the org hasn't connected Square yet.
export async function GET() {
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

  return NextResponse.json({ applicationId, locationId: conn.locationId });
}
