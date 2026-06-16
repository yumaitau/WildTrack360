import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { deleteNews, getNews, updateNews } from '@/lib/news';

async function authorise(id: string) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return { error: gated };
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch (error) {
    if (isForbiddenError(error)) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    throw error;
  }
  return { userId, orgId, id };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authorise(id);
  if ('error' in ctx) return ctx.error;
  const post = await getNews(id, ctx.orgId);
  if (!post) return NextResponse.json({ error: 'News post not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authorise(id);
  if ('error' in ctx) return ctx.error;
  try {
    const body = await request.json();
    const post = await updateNews(id, ctx.orgId, body);
    logAudit({
      userId: ctx.userId,
      orgId: ctx.orgId,
      action: 'UPDATE',
      entity: 'NewsPost',
      entityId: id,
    });
    return NextResponse.json(post);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update news post';
    const status = message === 'News post not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authorise(id);
  if ('error' in ctx) return ctx.error;
  try {
    await deleteNews(id, ctx.orgId);
    logAudit({
      userId: ctx.userId,
      orgId: ctx.orgId,
      action: 'DELETE',
      entity: 'NewsPost',
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete news post';
    const status = message === 'News post not found' ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? message : 'Failed to delete news post' },
      { status }
    );
  }
}
