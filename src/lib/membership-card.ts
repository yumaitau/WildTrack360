'server-only';

import QRCode from 'qrcode';
import { getOrgDisplayInfo } from './org-info';
import { getEffectiveMembership } from './household';
import type { Member } from '@prisma/client';

export interface MembershipCard {
  orgName: string;
  memberName: string;
  memberNumber: string | null;
  identifier: string;
  tierName: string | null;
  memberStatus: string;
  validUntil: string | null;
  // Set when this person's coverage comes from a household primary member.
  householdOf: string | null;
  // Set for gifted/complimentary memberships.
  giftedBy: string | null;
  // Inline SVG QR encoding a scannable member identifier for event check-in.
  qrSvg: string;
}

// Build the data for a member's digital membership card, including a QR code
// staff can scan at events. The QR encodes a compact, namespaced identifier
// (member number where set, else the internal id) scoped to the organisation.
// Coverage resolves through household membership, so secondary members get a
// card too.
export async function getMembershipCard(member: Member): Promise<MembershipCard> {
  const [org, effective] = await Promise.all([
    getOrgDisplayInfo(member.clerkOrganizationId),
    getEffectiveMembership(member),
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
    tierName: effective?.tier.name ?? null,
    memberStatus: effective?.status ?? member.status,
    validUntil: effective ? effective.periodEnd.toISOString() : null,
    householdOf: effective?.viaPrimary ? effective.primaryName : null,
    giftedBy: effective?.giftedBy ?? null,
    qrSvg,
  };
}
