import type { BillingInterval, PaymentKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatAmountCents, receiptKindLabel } from '@/lib/receipts';
import { sendAdminNotification } from './admin-notifications';

type PaymentAdminEvent = 'donation-received' | 'membership-signup' | 'membership-renewed';

const PAYMENT_ADMIN_CTA_HREF = '/admin/payments';
const MEMBER_ADMIN_CTA_HREF = '/admin/members';

async function loadPaymentForAdminNotification(paymentId: string, orgId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, clerkOrganizationId: orgId },
    include: {
      donations: {
        select: {
          donorEmail: true,
          donorName: true,
          isAnonymous: true,
          message: true,
        },
        take: 1,
      },
      member: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          memberNumber: true,
        },
      },
    },
  });
}

type PaymentForAdminNotification = NonNullable<
  Awaited<ReturnType<typeof loadPaymentForAdminNotification>>
>;

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function metadataEvent(metadata: Record<string, unknown>): PaymentAdminEvent | null {
  const event = metadataString(metadata, 'adminNotificationEvent');
  if (
    event === 'donation-received' ||
    event === 'membership-signup' ||
    event === 'membership-renewed'
  ) {
    return event;
  }
  return null;
}

function isDonation(kind: PaymentKind): boolean {
  return kind === 'DONATION_ONE_OFF' || kind === 'DONATION_RECURRING';
}

function isMembership(kind: PaymentKind): boolean {
  return kind === 'MEMBERSHIP_ONE_OFF' || kind === 'MEMBERSHIP_RECURRING';
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateRange(
  start: Date | null | undefined,
  end: Date | null | undefined
): string | null {
  if (!start || !end) return null;
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function intervalLabel(interval: BillingInterval | null | undefined): string | null {
  switch (interval) {
    case 'MONTHLY':
      return 'Monthly';
    case 'ANNUAL':
      return 'Annual';
    case 'ONE_OFF':
      return 'One-off';
    case 'LIFETIME':
      return 'Lifetime';
    default:
      return null;
  }
}

function personName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function fallbackPersonLabel(name: string | null, email: string | null, fallback: string): string {
  return name || email || fallback;
}

function compactInfo(items: ({ label: string; value: string | null | undefined } | null)[]) {
  return items
    .filter((item): item is { label: string; value: string } => Boolean(item?.value))
    .map((item) => ({ label: item.label, value: item.value }));
}

export async function sendPaymentActivityAdminNotification(
  paymentId: string,
  orgId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const payment = await loadPaymentForAdminNotification(paymentId, orgId);

  if (!payment || payment.status !== 'SUCCEEDED') return;

  const metadata = metadataRecord(payment.metadata);
  const event = metadataEvent(metadata);

  if (isDonation(payment.kind)) {
    await sendDonationNotification(payment, metadata);
    return;
  }

  if (isMembership(payment.kind)) {
    await sendMembershipNotification(payment, metadata, event);
  }
}

async function sendDonationNotification(
  payment: PaymentForAdminNotification,
  metadata: Record<string, unknown>
) {
  const donation = payment.donations[0];
  const donorEmail = donation?.donorEmail ?? metadataString(metadata, 'donorEmail');
  const donorName = donation?.donorName ?? metadataString(metadata, 'donorName');
  const donorLabel = donation?.isAnonymous
    ? 'Anonymous supporter'
    : fallbackPersonLabel(donorName, donorEmail, 'A supporter');
  const amount = formatAmountCents(payment.amountCents, payment.currency);

  await sendAdminNotification({
    orgId: payment.clerkOrganizationId,
    kind: 'payment.donation',
    recipientRoles: ['ADMIN'],
    title: `New donation: ${amount}`,
    body:
      `${donorLabel} made a donation through WildTrack360. The payment has been recorded and receipt details are available in the payments register.` +
      (donation?.message ? '\n\nThe donor also left a message for your organisation.' : ''),
    cta: { label: 'Review payment', href: PAYMENT_ADMIN_CTA_HREF },
    dedupeKey: `payment:${payment.id}`,
    info: compactInfo([
      { label: 'Amount', value: `${amount} ${payment.currency}` },
      { label: 'Donor', value: donorLabel },
      { label: 'Receipt email', value: donorEmail },
      { label: 'Payment type', value: receiptKindLabel(payment.kind) },
      { label: 'Receipt number', value: payment.receiptNumber },
      { label: 'Payment date', value: formatDate(payment.updatedAt) },
      donation?.message ? { label: 'Donor message', value: donation.message } : null,
    ]),
  });
}

async function sendMembershipNotification(
  payment: PaymentForAdminNotification,
  metadata: Record<string, unknown>,
  metadataEventValue: PaymentAdminEvent | null
) {
  const membership = await prisma.membership.findFirst({
    where: {
      paymentId: payment.id,
      clerkOrganizationId: payment.clerkOrganizationId,
    },
    include: { tier: true },
    orderBy: { createdAt: 'desc' },
  });

  const recurringSubscriptionId =
    metadataString(metadata, 'recurringSubscriptionId') ??
    membership?.recurringSubscriptionId ??
    null;
  const recurringSubscription = recurringSubscriptionId
    ? await prisma.recurringSubscription.findUnique({
        where: { id: recurringSubscriptionId },
        select: { interval: true, lastChargedAt: true },
      })
    : null;

  const event =
    metadataEventValue === 'membership-signup' || metadataEventValue === 'membership-renewed'
      ? metadataEventValue
      : recurringSubscription?.lastChargedAt
        ? 'membership-renewed'
        : 'membership-signup';
  const memberName = personName(payment.member?.firstName, payment.member?.lastName);
  const memberEmail = payment.member?.email ?? metadataString(metadata, 'donorEmail');
  const memberLabel = fallbackPersonLabel(memberName, memberEmail, 'A member');
  const tierName = membership?.tier.name ?? 'Membership';
  const amount = formatAmountCents(payment.amountCents, payment.currency);
  const period = formatDateRange(membership?.periodStart, membership?.periodEnd);
  const billingInterval = intervalLabel(
    membership?.tier.billingInterval ?? recurringSubscription?.interval
  );

  await sendAdminNotification({
    orgId: payment.clerkOrganizationId,
    kind: event === 'membership-renewed' ? 'membership.renewal' : 'membership.signup',
    recipientRoles: ['ADMIN'],
    title:
      event === 'membership-renewed'
        ? `Membership renewed: ${memberLabel}`
        : `New member signup: ${memberLabel}`,
    body:
      event === 'membership-renewed'
        ? `${memberLabel}'s membership renewed successfully through WildTrack360. The payment, receipt, and active membership period have been recorded.`
        : `${memberLabel} completed a paid membership signup through WildTrack360. The payment, receipt, and active membership period have been recorded.`,
    cta: { label: 'Review members', href: MEMBER_ADMIN_CTA_HREF },
    dedupeKey: `payment:${payment.id}`,
    info: compactInfo([
      { label: 'Member', value: memberLabel },
      { label: 'Email', value: memberEmail },
      { label: 'Member number', value: payment.member?.memberNumber },
      { label: 'Tier', value: tierName },
      { label: 'Amount', value: `${amount} ${payment.currency}` },
      { label: 'Billing', value: billingInterval },
      {
        label: event === 'membership-renewed' ? 'Renewed period' : 'Membership period',
        value: period,
      },
      { label: 'Receipt number', value: payment.receiptNumber },
      { label: 'Payment date', value: formatDate(payment.updatedAt) },
    ]),
  });
}
