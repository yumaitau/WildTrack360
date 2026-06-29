import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { createNews, listNews } from '@/lib/news';
import { route } from '@/lib/openapi/route';
import { listNewsContract, createNewsContract } from './openapi';

export const GET = route(listNewsContract, async () => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'member:manage'); }
  catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    throw error;
  }
  try {
    const posts = await listNews(orgId);
    return { data: posts };
  } catch (error) {
    console.error('Error listing news posts:', error);
    return NextResponse.json({ error: 'Failed to list news posts' }, { status: 500 });
  }
});

export const POST = route(createNewsContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'member:manage'); }
  catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    throw error;
  }
  try {
    let authorName: string | null = null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      authorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    } catch { /* best-effort */ }
    const post = await createNews(orgId, body, { clerkUserId: userId, name: authorName });
    logAudit({ userId, orgId, action: 'CREATE', entity: 'NewsPost', entityId: post.id, metadata: { title: post.title } });
    return { data: post, status: 201 as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create news post';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
