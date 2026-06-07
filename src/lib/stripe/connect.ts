'server-only';

import { prisma } from '../prisma';
import { getStripe } from './client';
import { resolveBaseUrl } from './config';

export interface ConnectStatus {
  connected: boolean;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export async function getConnectStatus(orgId: string): Promise<ConnectStatus> {
  const account = await prisma.stripeAccount.findUnique({
    where: { clerkOrganizationId: orgId },
  });
  if (!account) {
    return {
      connected: false,
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
  }
  return {
    connected: true,
    stripeAccountId: account.stripeAccountId,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    detailsSubmitted: account.detailsSubmitted,
  };
}

// Create a Stripe Standard connected account for the org if none exists, then
// issue a hosted onboarding link. Standard accounts give the wildlife org its
// own Stripe dashboard + responsibility for AU DGR tax receipts.
export async function startOnboarding(args: {
  orgId: string;
  contactEmail: string | null;
}): Promise<{ url: string; accountId: string }> {
  const stripe = getStripe();
  const baseUrl = resolveBaseUrl();

  let account = await prisma.stripeAccount.findUnique({
    where: { clerkOrganizationId: args.orgId },
  });

  if (!account) {
    const created = await stripe.accounts.create({
      type: 'standard',
      country: 'AU',
      email: args.contactEmail ?? undefined,
      metadata: { clerkOrganizationId: args.orgId },
    });
    account = await prisma.stripeAccount.create({
      data: {
        clerkOrganizationId: args.orgId,
        stripeAccountId: created.id,
        accountType: 'standard',
        chargesEnabled: created.charges_enabled,
        payoutsEnabled: created.payouts_enabled,
        detailsSubmitted: created.details_submitted,
      },
    });
  }

  const link = await stripe.accountLinks.create({
    account: account.stripeAccountId,
    refresh_url: `${baseUrl}/admin/payments/settings?refresh=1`,
    return_url: `${baseUrl}/admin/payments/settings?ok=1`,
    type: 'account_onboarding',
  });

  return { url: link.url, accountId: account.stripeAccountId };
}

// Re-fetch live state from Stripe so the admin UI shows whether onboarding is
// actually complete. Stripe doesn't push every state change to the webhook, so
// we expose this as a manual refresh.
export async function syncAccountStatus(orgId: string): Promise<ConnectStatus> {
  const account = await prisma.stripeAccount.findUnique({
    where: { clerkOrganizationId: orgId },
  });
  if (!account) {
    return {
      connected: false,
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
  }
  const stripe = getStripe();
  const live = await stripe.accounts.retrieve(account.stripeAccountId);

  const updated = await prisma.stripeAccount.update({
    where: { clerkOrganizationId: orgId },
    data: {
      chargesEnabled: live.charges_enabled,
      payoutsEnabled: live.payouts_enabled,
      detailsSubmitted: live.details_submitted,
      onboardingCompletedAt:
        live.details_submitted && !account.onboardingCompletedAt ? new Date() : account.onboardingCompletedAt,
    },
  });

  return {
    connected: true,
    stripeAccountId: updated.stripeAccountId,
    chargesEnabled: updated.chargesEnabled,
    payoutsEnabled: updated.payoutsEnabled,
    detailsSubmitted: updated.detailsSubmitted,
  };
}
