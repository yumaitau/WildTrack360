import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { getPortalMember } from '@/lib/portal';
import { createCarerInterest, getOpenInterest } from '@/lib/carer-interest';
import { sanitizePlainText } from '@/lib/sanitize';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });

  const open = await getOpenInterest(
    session.member.clerkOrganizationId,
    session.member.id,
    session.email
  );
  return NextResponse.json({ open });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = await getPortalMember(userId);
  if (!session) return NextResponse.json({ error: 'No membership found' }, { status: 404 });

  try {
    const body = (await request.json()) as {
      phone?: string;
      experience?: string;
      availability?: string;
      message?: string;
    };
    const member = session.member;
    const created = await createCarerInterest(member.clerkOrganizationId, {
      memberId: member.id,
      name: `${member.firstName} ${member.lastName}`.trim(),
      email: session.email,
      phone: body.phone ? sanitizePlainText(String(body.phone)) : member.phone,
      experience: body.experience ? sanitizePlainText(String(body.experience), { allowNewlines: true }) : null,
      availability: body.availability ? sanitizePlainText(String(body.availability), { allowNewlines: true }) : null,
      message: body.message ? sanitizePlainText(String(body.message), { allowNewlines: true }) : null,
    });
    return NextResponse.json({ id: created.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
