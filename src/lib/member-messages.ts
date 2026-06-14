'server-only';

import { prisma } from './prisma';
import { getImpactStats } from './org-info';

// Merge tokens an admin can use in a member message. Rendered server-side before
// the message is stored, so the portal and the email show identical final text.
export interface MergeContext {
  firstName: string;
  lastName: string;
  orgName: string;
  animalsHelped: number;
  animalsReleased: number;
}

export const MERGE_TOKENS: { token: string; label: string }[] = [
  { token: '{{firstName}}', label: "Member's first name" },
  { token: '{{lastName}}', label: "Member's last name" },
  { token: '{{orgName}}', label: 'Your organisation name' },
  { token: '{{animalsHelped}}', label: 'Animals your org has cared for' },
  { token: '{{animalsReleased}}', label: 'Animals your org has released' },
];

export function renderMergeTokens(template: string, ctx: MergeContext): string {
  return template
    .replace(/\{\{\s*firstName\s*\}\}/gi, ctx.firstName)
    .replace(/\{\{\s*lastName\s*\}\}/gi, ctx.lastName)
    .replace(/\{\{\s*orgName\s*\}\}/gi, ctx.orgName)
    .replace(/\{\{\s*animalsHelped\s*\}\}/gi, ctx.animalsHelped.toLocaleString('en-AU'))
    .replace(/\{\{\s*animalsReleased\s*\}\}/gi, ctx.animalsReleased.toLocaleString('en-AU'));
}

export interface ComposeInput {
  memberIds: string[];
  subject: string;
  body: string;
  sendEmail: boolean;
}

export interface ComposedMessage {
  messageId: string;
  memberId: string;
  email: string;
  memberName: string;
  subject: string;
  body: string;
}

// Validate + persist one MemberMessage per targeted member, rendering merge
// tokens against each member and the org's live impact stats. Returns the
// created rows (with the recipient's email) so the caller can fan out emails.
// Members are filtered to the org and non-archived; unknown ids are ignored.
export async function composeMemberMessages(
  orgId: string,
  orgName: string,
  input: ComposeInput,
  sender: { clerkUserId: string; name: string | null }
): Promise<ComposedMessage[]> {
  const subject = input.subject?.trim();
  const body = input.body;
  if (!subject) throw new Error('Subject is required');
  if (!body?.trim()) throw new Error('Message body is required');
  const ids = [...new Set((input.memberIds ?? []).filter((id) => typeof id === 'string'))];
  if (ids.length === 0) throw new Error('Select at least one member');

  const members = await prisma.member.findMany({
    where: { id: { in: ids }, clerkOrganizationId: orgId, archivedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (members.length === 0) throw new Error('No matching members found');

  const stats = await getImpactStats(orgId);

  const created: ComposedMessage[] = [];
  for (const m of members) {
    const ctx: MergeContext = {
      firstName: m.firstName,
      lastName: m.lastName,
      orgName,
      animalsHelped: stats.animalsHelped,
      animalsReleased: stats.animalsReleased,
    };
    const renderedSubject = renderMergeTokens(subject, ctx);
    const renderedBody = renderMergeTokens(body, ctx);
    const row = await prisma.memberMessage.create({
      data: {
        clerkOrganizationId: orgId,
        memberId: m.id,
        subject: renderedSubject,
        body: renderedBody,
        sentByClerkUserId: sender.clerkUserId,
        sentByName: sender.name,
        emailSentAt: null,
      },
      select: { id: true },
    });
    created.push({
      messageId: row.id,
      memberId: m.id,
      email: m.email,
      memberName: `${m.firstName} ${m.lastName}`.trim(),
      subject: renderedSubject,
      body: renderedBody,
    });
  }
  return created;
}

export function listMemberMessages(memberId: string, limit = 100, cursor?: string | null) {
  return prisma.memberMessage.findMany({
    where: { memberId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export function countUnreadMessages(memberId: string) {
  return prisma.memberMessage.count({ where: { memberId, readAt: null } });
}

export async function markMessageRead(id: string, memberId: string) {
  const result = await prisma.memberMessage.updateMany({
    where: { id, memberId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}
