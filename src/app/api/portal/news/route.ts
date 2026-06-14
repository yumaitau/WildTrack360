import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { gateFeature } from '@/lib/features';
import { listPublishedNews } from '@/lib/news';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });
  const gated = await gateFeature(session.member.clerkOrganizationId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;

  const posts = await listPublishedNews(session.member.clerkOrganizationId);
  return NextResponse.json(
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      authorName: p.authorName,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }))
  );
}
