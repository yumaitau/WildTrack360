import { NextRequest, NextResponse } from 'next/server';
import { CommunityFeedbackStatus } from '@prisma/client';
import { requireCommunityStaffAdmin } from '@/lib/community/admin';
import { resolveRecipientEmail } from '@/lib/community/email/recipient';
import { prisma } from '@/lib/prisma';

const LIMIT = 50;

export async function GET(request: NextRequest) {
  const auth = await requireCommunityStaffAdmin();
  if ('error' in auth) return auth.error;

  const cursor = request.nextUrl.searchParams.get('cursor');
  const statusParam = request.nextUrl.searchParams.get('status');
  const status =
    statusParam && statusParam in CommunityFeedbackStatus
      ? (statusParam as CommunityFeedbackStatus)
      : undefined;

  const rows = await prisma.communityBetaFeedback.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      message: true,
      requestedFeatures: true,
      status: true,
      triageNote: true,
      roadmapUrl: true,
      contactConsent: true,
      createdAt: true,
      profile: { select: { displayName: true, clerkUserId: true } },
    },
  });

  const page = rows.slice(0, LIMIT);
  const nextCursor = rows.length > LIMIT ? page[page.length - 1].id : null;

  const items = await Promise.all(
    page.map(async (row) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      requestedFeatures: row.requestedFeatures,
      status: row.status,
      triageNote: row.triageNote,
      roadmapUrl: row.roadmapUrl,
      contactConsent: row.contactConsent,
      // Only reveal an identity when the submitter consented to contact. The
      // display name is a pseudonym, so also surface their email (resolved from
      // Clerk on demand) so "Contact OK" is actionable.
      authorDisplayName: row.contactConsent ? row.profile.displayName : null,
      authorEmail: row.contactConsent
        ? (await resolveRecipientEmail(row.profile.clerkUserId)).email
        : null,
      createdAt: row.createdAt,
    }))
  );

  return NextResponse.json({ items, nextCursor });
}
