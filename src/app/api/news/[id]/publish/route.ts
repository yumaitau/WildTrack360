import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { markNewsEmailed, publishNews, unpublishNews } from '@/lib/news';
import { getOrgDisplayInfo } from '@/lib/org-info';
import { broadcastNewsPost } from '@/lib/email/member-broadcast';
import { route } from '@/lib/openapi/route';
import { publishNewsPostContract } from '../../openapi';

// POST /api/news/[id]/publish - publish a post and (unless already emailed)
// broadcast it to active members. Body: { sendEmail?: boolean, unpublish?: boolean }.
export const POST = route(publishNewsPostContract, async ({ params, body }) => {
  const { id } = params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try { await requirePermission(userId, orgId, 'member:manage'); }
  catch (error) {
    if (isForbiddenError(error)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    throw error;
  }

  const sendEmail = body.sendEmail !== false;

  try {
    if (body.unpublish) {
      const post = await unpublishNews(id, orgId);
      logAudit({ userId, orgId, action: 'UPDATE', entity: 'NewsPost', entityId: id, metadata: { unpublished: true } });
      return { data: { post, emailed: 0 } };
    }

    const post = await publishNews(id, orgId);
    let emailed = 0;

    if (sendEmail && !post.emailSentAt) {
      const claim = await prisma.newsPost.updateMany({
        where: { id: post.id, clerkOrganizationId: orgId, emailSentAt: null },
        data: { emailSentAt: new Date(), recipientCount: 0 },
      });
      if (claim.count === 0) return { data: { post, emailed: 0 } };

      const org = await getOrgDisplayInfo(orgId);
      const recipients = await prisma.member.findMany({
        where: { clerkOrganizationId: orgId, archivedAt: null, status: 'ACTIVE' },
        select: { email: true, firstName: true },
      });
      emailed = await broadcastNewsPost(recipients, org, { title: post.title, body: post.body });
      await markNewsEmailed(post.id, emailed);
    }

    logAudit({ userId, orgId, action: 'UPDATE', entity: 'NewsPost', entityId: id, metadata: { published: true, emailed } });
    return { data: { post, emailed } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish news post';
    const status = message === 'News post not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
});
