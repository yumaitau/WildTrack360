import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { composeMemberMessages } from '@/lib/member-messages';
import { getOrgDisplayInfo } from '@/lib/org-info';
import { sendMemberMessageEmail } from '@/lib/email/member-broadcast';

// POST /api/members/messages — send a message to one or more selected members.
// Body: { memberIds: string[], subject: string, body: string, sendEmail?: boolean }
// Supports merge tokens ({{firstName}}, {{animalsHelped}}, …) rendered per member.
export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const sendEmail = body?.sendEmail !== false; // default true

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
      {
        memberIds: Array.isArray(body?.memberIds) ? body.memberIds : [],
        subject: String(body?.subject ?? ''),
        body: String(body?.body ?? ''),
        sendEmail,
      },
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
    }

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'MemberMessage',
      metadata: { recipients: messages.length, emailed },
    });

    return NextResponse.json({ created: messages.length, emailed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
