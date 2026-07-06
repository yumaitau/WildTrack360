import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getEnrichedCarers } from '@/lib/carer-helpers';
import { fetchFeedRosterItems } from '@/lib/feed-roster';
import { getOrgMember, getUserRole } from '@/lib/rbac';
import { route } from '@/lib/openapi/route';
import { feedRosterContract } from './openapi';

export const GET = route(feedRosterContract, async ({ query }) => {
  const { userId, orgId: activeOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requestedOrgId = query.orgId || activeOrgId || undefined;
  if (!requestedOrgId)
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  if (activeOrgId && requestedOrgId !== activeOrgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const member = await getOrgMember(userId, requestedOrgId);
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const role = await getUserRole(userId, requestedOrgId);
    const carers = await getEnrichedCarers(requestedOrgId);
    const carerMap = new Map(
      carers.map((c) => [c.id, c.name || c.email || 'Carer email unavailable'])
    );
    const items = await fetchFeedRosterItems(role, userId, requestedOrgId, carerMap);
    return { data: items };
  } catch (error) {
    console.error('feed-roster GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
