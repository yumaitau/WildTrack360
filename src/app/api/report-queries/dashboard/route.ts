import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authenticateReportUser,
  canPreviewReports,
  ReportAccessError,
} from '@/lib/custom-query/access';
import { evaluateCustomQuery, type QueryablePrisma } from '@/lib/custom-query/evaluator';
import { getReportCarerNamesById } from '@/lib/custom-query/carer-names';

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function needsCarerNames(query: string) {
  return /\b(?:carerName|animal_assignments)\b/i.test(query);
}

// GET /api/report-queries/dashboard?start=&end=
//
// Returns saved queries flagged `showOnDashboard` for the caller's org, each
// already evaluated against the dashboard timeframe. Same parser/evaluator as
// the workbench; no AI, no report drafts. Invalid queries come back with
// `result.ok === false` so the widget can show an error state.
export async function GET(request: Request) {
  try {
    const { orgId, role } = await authenticateReportUser();
    if (!canPreviewReports(role)) {
      return NextResponse.json({ widgets: [] });
    }

    const { searchParams } = new URL(request.url);
    const defaultStart = parseDate(searchParams.get('start'));
    const defaultEnd = parseDate(searchParams.get('end'));

    const queries = await prisma.savedReportQuery.findMany({
      where: { orgId, showOnDashboard: true },
      orderBy: { createdAt: 'asc' },
    });

    const carerNamesById = queries.some((query) => needsCarerNames(query.query))
      ? await getReportCarerNamesById(orgId)
      : undefined;

    const widgets = await Promise.all(
      queries.map(async (q) => ({
        id: q.id,
        name: q.name,
        visualization: q.visualization,
        result: await evaluateCustomQuery(q.query, {
          prisma: prisma as unknown as QueryablePrisma,
          orgId,
          defaultStart,
          defaultEnd,
          carerNamesById,
        }),
      }))
    );

    return NextResponse.json({ widgets });
  } catch (error) {
    if (error instanceof ReportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Dashboard widgets error:', error);
    return NextResponse.json({ error: 'Failed to load widgets' }, { status: 500 });
  }
}
