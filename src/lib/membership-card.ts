'server-only';

import QRCode from 'qrcode';
import { prisma } from './prisma';
import { getOrgDisplayInfo } from './org-info';
import type { Member } from '@prisma/client';

export interface MembershipCard {
  orgName: string;
  memberName: string;
  memberNumber: string | null;
  identifier: string;
  tierName: string | null;
  memberStatus: string;
  validUntil: string | null;
  // Inline SVG QR encoding a scannable member identifier for event check-in.
  qrSvg: string;
}

// Build the data for a member's digital membership card, including a QR code
// staff can scan at events. The QR encodes a compact, namespaced identifier
// (member number where set, else the internal id) scoped to the organisation.
export async function getMembershipCard(member: Member): Promise<MembershipCard> {
  const [org, membership] = await Promise.all([
    getOrgDisplayInfo(member.clerkOrganizationId),
    prisma.membership.findFirst({
      where: { memberId: member.id, status: 'ACTIVE' },
      include: { tier: true },
      orderBy: { periodEnd: 'desc' },
    }),
  ]);

  const identifier = member.memberNumber ?? member.id;
  const qrSvg = await QRCode.toString(`WT360:${member.clerkOrganizationId}:${identifier}`, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return {
    orgName: org.name,
    memberName: `${member.firstName} ${member.lastName}`.trim(),
    memberNumber: member.memberNumber,
    identifier,
    tierName: membership?.tier.name ?? null,
    memberStatus: member.status,
    validUntil: membership ? membership.periodEnd.toISOString() : null,
    qrSvg,
  };
}
