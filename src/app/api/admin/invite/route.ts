import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { getUserRole } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { inviteUserContract } from '../openapi';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export const POST = route(inviteUserContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getUserRole(userId, orgId);
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { emailAddress } = body;
  if (!emailAddress) return NextResponse.json({ error: 'Email address is required' }, { status: 400 });

  try {
    const clerk = await clerkClient();
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    const orgUrl = (org.publicMetadata as Record<string, unknown>)?.org_url as string | undefined;

    const protocol = ROOT_DOMAIN.startsWith('localhost') ? 'http' : 'https';
    const safeHostname = orgUrl && /^[a-zA-Z0-9-]+$/.test(orgUrl);
    const redirectUrl = safeHostname
      ? `${protocol}://${orgUrl}.${ROOT_DOMAIN}/sign-up`
      : `${protocol}://${ROOT_DOMAIN}/sign-up`;

    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role: 'org:member',
      inviterUserId: userId,
      redirectUrl,
    });

    return { data: { id: invitation.id } };
  } catch (error) {
    console.error('Clerk API error during invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 502 });
  }
});
