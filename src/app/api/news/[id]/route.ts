import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { deleteNews, getNews, updateNews } from '@/lib/news';
import { route } from '@/lib/openapi/route';
import { getNewsPostContract, updateNewsPostContract, deleteNewsPostContract } from '../openapi';

async function authorise(orgId: string, userId: string) {
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return { error: gated };
  try { await requirePermission(userId, orgId, 'member:manage'); }
  catch (error) {
    if (isForbiddenError(error)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    throw error;
  }
  return null;
}

export const GET = route(getNewsPostContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authError = await authorise(orgId, userId);
  if (authError) return authError.error;
  const post = await getNews(id, orgId);
  if (!post) return NextResponse.json({ error: 'News post not found' }, { status: 404 });
  return { data: post };
});

export const PATCH = route(updateNewsPostContract, async ({ params, body }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authError = await authorise(orgId, userId);
  if (authError) return authError.error;
  try {
    const post = await updateNews(id, orgId, body);
    logAudit({ userId, orgId, action: 'UPDATE', entity: 'NewsPost', entityId: id });
    return { data: post };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update news post';
    const status = message === 'News post not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
});

export const DELETE = route(deleteNewsPostContract, async ({ params }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authError = await authorise(orgId, userId);
  if (authError) return authError.error;
  try {
    await deleteNews(id, orgId);
    logAudit({ userId, orgId, action: 'DELETE', entity: 'NewsPost', entityId: id });
    return { data: { ok: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete news post';
    const status = message === 'News post not found' ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? message : 'Failed to delete news post' }, { status });
  }
});
