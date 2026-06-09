import { NextResponse } from 'next/server';
import { resolvePublicOrg } from '@/lib/public-org';
import { createDonationPayment } from '@/lib/square/checkout';
import { sanitizePlainText } from '@/lib/sanitize';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public, unauthenticated one-off donation. The org is resolved from the
// subdomain handle (never a client-supplied org id), the donor is anonymous (no
// Member), and the existing Square app-fee charge path is reused.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      handle?: string;
      amountCents?: number;
      donorName?: string | null;
      donorEmail?: string;
      message?: string | null;
      isAnonymous?: boolean;
      sourceId?: string;
      verificationToken?: string | null;
    };

    const org = await resolvePublicOrg(String(body.handle ?? ''));
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

    if (typeof body.amountCents !== 'number') {
      return NextResponse.json({ error: 'amountCents required' }, { status: 400 });
    }
    if (!body.sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

    const donorEmail = String(body.donorEmail ?? '').trim();
    if (!EMAIL_PATTERN.test(donorEmail) || donorEmail.length > 254) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const result = await createDonationPayment({
      orgId: org.orgId,
      amountCents: body.amountCents,
      donorEmail,
      donorName: body.donorName ? sanitizePlainText(String(body.donorName)) : null,
      message: body.message ? sanitizePlainText(String(body.message), { allowNewlines: true }) : null,
      isAnonymous: Boolean(body.isAnonymous),
      memberId: null,
      sourceId: body.sourceId,
      verificationToken: body.verificationToken ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process donation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
