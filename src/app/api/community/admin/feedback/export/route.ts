import { NextRequest, NextResponse } from 'next/server';
import { requireCommunityStaffAdmin } from '@/lib/community/admin';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

// Frozen column order — the accepting spreadsheet keys on header names.
const HEADER = [
  'Created',
  'Type',
  'Status',
  'RequestedFeatures',
  'ContactConsent',
  'AuthorDisplayName',
  'TriageNote',
  'RoadmapUrl',
  'Message',
].join(',');

export async function GET(request: NextRequest) {
  const auth = await requireCommunityStaffAdmin();
  if ('error' in auth) return auth.error;

  const rows = await prisma.communityBetaFeedback.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      type: true,
      message: true,
      requestedFeatures: true,
      status: true,
      triageNote: true,
      roadmapUrl: true,
      contactConsent: true,
      createdAt: true,
      profile: { select: { displayName: true } },
    },
  });

  const lines = rows.map((row) =>
    [
      row.createdAt.toISOString(),
      row.type,
      row.status,
      csvEscape(row.requestedFeatures.join('; ')),
      row.contactConsent ? 'true' : 'false',
      csvEscape(row.contactConsent ? row.profile.displayName : ''),
      csvEscape(row.triageNote ?? ''),
      csvEscape(row.roadmapUrl ?? ''),
      csvEscape((row.message ?? '').replace(/[\r\n]+/g, ' ')),
    ].join(',')
  );

  const csv = [HEADER, ...lines].join('\n');

  logAudit({
    userId: auth.session.userId,
    orgId: auth.session.homeOrgId ?? '',
    action: 'EXPORT',
    entity: 'community_beta_feedback',
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="community-feedback-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
