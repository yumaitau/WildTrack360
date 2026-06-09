import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePublicOrg } from '@/lib/public-org';
import { findOrCreateMember } from '@/lib/members';
import { createRecurringSubscription } from '@/lib/square/subscriptions';
import { invitePortalMember } from '@/lib/portal-invite';
import { sanitizePlainText } from '@/lib/sanitize';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MemberFields {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  customFields?: Record<string, unknown> | null;
}

const cleanOpt = (v: string | null | undefined) =>
  v == null ? null : sanitizePlainText(String(v)) || null;

// Public, unauthenticated "become a member" signup. Resolves the org from the
// subdomain handle, find-or-creates the Member, takes payment via the existing
// Square app-fee path, and (on success) sends a portal invitation so the new
// member can activate their login. A failed charge throws before any invite —
// the Membership row itself is only created by recordSuccessfulPayment.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      handle?: string;
      tierId?: string;
      sourceId?: string;
      verificationToken?: string | null;
      member?: MemberFields;
    };

    const org = await resolvePublicOrg(String(body.handle ?? ''));
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

    if (!body.tierId) return NextResponse.json({ error: 'tierId required' }, { status: 400 });
    if (!body.sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const m = body.member ?? {};
    const email = String(m.email ?? '').trim();
    // Length cap runs before the regex to bound worst-case regex runtime (ReDoS defence).
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const firstName = sanitizePlainText(String(m.firstName ?? ''));
    const lastName = sanitizePlainText(String(m.lastName ?? ''));
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
    }

    const tier = await prisma.membershipTier.findFirst({
      where: { id: body.tierId, clerkOrganizationId: org.orgId, active: true, archivedAt: null },
    });
    if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });

    const member = await findOrCreateMember(org.orgId, {
      email,
      firstName,
      lastName,
      phone: cleanOpt(m.phone),
      addressLine1: cleanOpt(m.addressLine1),
      addressLine2: cleanOpt(m.addressLine2),
      suburb: cleanOpt(m.suburb),
      state: cleanOpt(m.state),
      postcode: cleanOpt(m.postcode),
      country: cleanOpt(m.country) ?? 'AU',
      customFields: m.customFields ?? {},
    });

    const donorName = `${member.firstName} ${member.lastName}`.trim();

    // Memberships are always an annual auto-renewing commitment.
    const result = await createRecurringSubscription({
      orgId: org.orgId,
      memberId: member.id,
      kind: 'MEMBERSHIP',
      tierId: tier.id,
      donorEmail: member.email,
      donorName,
      amountCents: tier.amountCents,
      currency: tier.currency,
      interval: 'ANNUAL',
      sourceId: body.sourceId,
      verificationToken: body.verificationToken ?? null,
    });

    // Provision portal access (best-effort — never voids the paid membership).
    // invitePortalMember already swallows its own errors, but guard the call too
    // so an unexpected throw can't fail the request after a successful charge
    // (which would invite a retry against the now-charged card).
    try {
      await invitePortalMember(member.id, org.orgId);
    } catch (inviteError) {
      console.error('Membership paid but portal invite failed', {
        memberId: member.id,
        orgId: org.orgId,
        error: inviteError instanceof Error ? inviteError.message : String(inviteError),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process membership';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
