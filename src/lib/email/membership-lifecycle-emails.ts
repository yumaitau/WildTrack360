'server-only';

import { sendEmail } from './resend';
import { MemberBroadcastEmail } from './templates/member-broadcast';
import type { MembershipNotificationKind } from '@prisma/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wildtrack360.com.au';

export interface LifecycleOrg {
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface LifecycleContext {
  firstName: string;
  tierName: string;
  // Pre-formatted period-end date (en-AU), used in renewal/lapse copy.
  periodEndFormatted: string;
}

interface Copy {
  subject: string;
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
}

// Plain, warm copy per lifecycle stage. Renewal/lapse point at the portal to
// renew; win-back invites the member back. (A future enhancement could attach a
// real dollar-off return offer — research shows dollar-off beats percent-off.)
function buildCopy(kind: MembershipNotificationKind, org: LifecycleOrg, ctx: LifecycleContext): Copy {
  switch (kind) {
    case 'RENEWAL_30':
      return {
        subject: `Your ${org.name} membership renews soon`,
        eyebrow: 'Membership renewal',
        heading: 'Your membership renews soon',
        body: `Your ${ctx.tierName} membership is due to expire on ${ctx.periodEndFormatted}. Renewing keeps your support going and your membership active — it only takes a minute.`,
        cta: 'Renew my membership',
      };
    case 'RENEWAL_7':
      return {
        subject: `Your ${org.name} membership expires in a week`,
        eyebrow: 'Membership renewal',
        heading: 'Just a week to renew',
        body: `Your ${ctx.tierName} membership expires on ${ctx.periodEndFormatted}. Renew now so your support of our wildlife work continues without a gap.`,
        cta: 'Renew now',
      };
    case 'RENEWAL_1':
      return {
        subject: `Your ${org.name} membership expires tomorrow`,
        eyebrow: 'Membership renewal',
        heading: 'Your membership expires tomorrow',
        body: `This is a friendly last reminder — your ${ctx.tierName} membership expires on ${ctx.periodEndFormatted}. Renew today to stay a member.`,
        cta: 'Renew today',
      };
    case 'LAPSED':
      return {
        subject: `Your ${org.name} membership has expired`,
        eyebrow: 'Membership',
        heading: 'Your membership has expired',
        body: `Your ${ctx.tierName} membership expired on ${ctx.periodEndFormatted}. We'd love to have you stay on — renewing takes just a moment and your support makes a real difference to the animals in our care.`,
        cta: 'Renew my membership',
      };
    case 'WINBACK_30':
      return {
        subject: `We'd love to welcome you back to ${org.name}`,
        eyebrow: "We miss you",
        heading: 'Come back and keep making a difference',
        body: `It's been about a month since your ${ctx.tierName} membership lapsed. Your support directly helps us rescue, rehabilitate and release wildlife — and it's easy to pick up right where you left off.`,
        cta: 'Rejoin now',
      };
    case 'WINBACK_90':
    default:
      return {
        subject: `Your spot at ${org.name} is still here`,
        eyebrow: "We miss you",
        heading: "There's still a place for you here",
        body: `We've missed you these past few months. The animals we care for depend on supporters like you — if now feels like the right time, we'd be thrilled to welcome you back as a member.`,
        cta: 'Become a member again',
      };
  }
}

// Email one lifecycle message. Best-effort: no-op when Resend isn't configured.
export async function sendMembershipLifecycleEmail(
  kind: MembershipNotificationKind,
  to: string,
  org: LifecycleOrg,
  ctx: LifecycleContext
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const copy = buildCopy(kind, org, ctx);
  await sendEmail({
    to,
    subject: copy.subject,
    react: MemberBroadcastEmail({
      orgName: org.name,
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      greeting: ctx.firstName ? `Hi ${ctx.firstName},` : null,
      body: copy.body,
      ctaLabel: copy.cta,
      ctaUrl: `${APP_URL}/portal/membership`,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      footerNote: 'You are receiving this because of your membership.',
    }),
    tags: [
      { name: 'kind', value: 'membership-lifecycle' },
      { name: 'stage', value: kind },
    ],
  });
  return true;
}
