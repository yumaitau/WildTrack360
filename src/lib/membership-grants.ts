'server-only';

import { prisma } from './prisma';
import { computeMembershipEnd } from './square/periods';
import { getOrgDisplayInfo } from './org-info';
import { sendEmail } from './email/resend';
import { MemberBroadcastEmail } from './email/templates/member-broadcast';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wildtrack360.com.au';

export interface GrantInput {
  memberId: string;
  tierId: string;
  giftedBy?: string | null;
}

// Grant a gifted / complimentary membership without a payment. Used for gifts
// bought offline, prizes, grants, and comps. Creates an active membership for
// the recipient at the chosen tier, reactivates a lapsed member, and emails a
// warm welcome.
export async function grantMembership(orgId: string, input: GrantInput) {
  const [tier, member] = await Promise.all([
    prisma.membershipTier.findFirst({ where: { id: input.tierId, clerkOrganizationId: orgId } }),
    prisma.member.findFirst({ where: { id: input.memberId, clerkOrganizationId: orgId } }),
  ]);
  if (!tier) throw new Error('Tier not found');
  if (!member) throw new Error('Member not found');

  const start = new Date();
  const end = computeMembershipEnd(start, tier.billingInterval);
  const giftedBy = (input.giftedBy?.trim() || 'Complimentary').slice(0, 120);

  const membership = await prisma.membership.create({
    data: {
      clerkOrganizationId: orgId,
      memberId: member.id,
      tierId: tier.id,
      periodStart: start,
      periodEnd: end,
      status: 'ACTIVE',
      giftedBy,
    },
  });

  // A gift reactivates a lapsed/cancelled member.
  await prisma.member.updateMany({
    where: { id: member.id, status: { in: ['LAPSED', 'CANCELLED'] } },
    data: { status: 'ACTIVE' },
  });

  // Best-effort welcome email.
  if (process.env.RESEND_API_KEY) {
    try {
      const org = await getOrgDisplayInfo(orgId);
      const isComp = giftedBy === 'Complimentary';
      await sendEmail({
        to: member.email,
        subject: isComp
          ? `Your complimentary ${org.name} membership`
          : `You've been gifted a ${org.name} membership`,
        react: MemberBroadcastEmail({
          orgName: org.name,
          eyebrow: 'Membership',
          heading: isComp ? 'Welcome — your membership is active' : 'Someone gifted you a membership!',
          greeting: member.firstName ? `Hi ${member.firstName},` : null,
          body: isComp
            ? `You've been given a complimentary ${tier.name} membership with ${org.name}, valid until ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. Welcome aboard — your support helps wildlife in need.`
            : `${giftedBy} has gifted you a ${tier.name} membership with ${org.name}, valid until ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. Welcome — we're so glad to have you.`,
          ctaLabel: 'View your membership',
          ctaUrl: `${APP_URL}/portal/card`,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
          footerNote: 'You are receiving this because a membership was created for you.',
        }),
        tags: [{ name: 'kind', value: 'membership-gift' }],
      });
    } catch (err) {
      console.error('Gift membership email failed', err);
    }
  }

  return { membershipId: membership.id, memberId: member.id, tierName: tier.name, validUntil: end.toISOString() };
}
