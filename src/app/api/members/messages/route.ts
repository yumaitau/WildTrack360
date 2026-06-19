import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { composeMemberMessages } from '@/lib/member-messages';
import { getOrgDisplayInfo } from '@/lib/org-info';
import { sendMemberMessageEmail } from '@/lib/email/member-broadcast';
import { prisma } from '@/lib/prisma';
import { route } from '@/lib/openapi/route';
import { sendMemberMessagesContract } from './openapi';

const MAX_EMAIL_RECIPIENTS = 100;

// POST /api/members/messages - send a message to one or more selected members.
// Supports merge tokens ({{firstName}}, {{animalsHelped}}, ...) rendered per member.
export const POST = route(sendMemberMessagesContract, async ({ body }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  // Preserve the isForbiddenError rethrow: non-forbidden permission errors
  // propagate to Next.js as 500s (same as before wrapping).
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw error;
  }

  try {
    const { memberIds, subject, body: msgBody, sendEmail = true } = body;
    if (sendEmail && new Set(memberIds).size > MAX_EMAIL_RECIPIENTS) {
      return NextResponse.json(
        { error: `Email broadcasts are limited to ${MAX_EMAIL_RECIPIENTS} recipients at a time` },
        { status: 400 }
      );
    }

    const org = await getOrgDisplayInfo(orgId);

    let senderName: string | null = null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      senderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    } catch {
      // best-effort sender name
    }

    const messages = await composeMemberMessages(
      orgId,
      org.name,
      { memberIds, subject, body: msgBody, sendEmail },
      { clerkUserId: userId, name: senderName }
    );

    let emailed = 0;
    if (sendEmail) {
      const results = await Promise.allSettled(
        messages.map((m) =>
          sendMemberMessageEmail(m.email, org, {
            subject: m.subject,
            body: m.body,
            memberFirstName: m.memberName.split(' ')[0] ?? '',
          })
        )
      );
      emailed = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      const emailedIds = results
        .map((result, index) =>
          result.status === 'fulfilled' && result.value ? messages[index].messageId : null
        )
        .filter((id): id is string => Boolean(id));
      if (emailedIds.length > 0) {
        await prisma.memberMessage.updateMany({
          where: { id: { in: emailedIds }, clerkOrganizationId: orgId },
          data: { emailSentAt: new Date() },
        });
      }
    }

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'MemberMessage',
      metadata: { recipients: messages.length, emailed },
    });

    return { data: { created: messages.length, emailed } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
