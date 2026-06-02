import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  authenticateReportUser,
  canPreviewReports,
  ReportAccessError,
} from '@/lib/custom-query/access';
import {
  evaluateCustomQueries,
  type QueryablePrisma,
} from '@/lib/custom-query/evaluator';

const MAX_LINES = 20;

const previewSchema = z.object({
  // Either a single query or a small batch of lines.
  query: z.string().optional(),
  queries: z.array(z.string()).max(MAX_LINES).optional(),
  // Optional report-period bounds (YYYY-MM-DD). Capped by the evaluator.
  start: z.string().optional(),
  end: z.string().optional(),
});

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// POST /api/report-queries/preview
//
// Evaluates one or more QL lines against the caller's org and returns
// aggregate-only result DTOs. This route performs NO AI generation and creates
// NO report drafts — it is a pure, read-only preview.
export async function POST(request: Request) {
  try {
    const { orgId, role } = await authenticateReportUser();
    if (!canPreviewReports(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = previewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const lines = (
      parsed.data.queries ?? (parsed.data.query ? [parsed.data.query] : [])
    )
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, MAX_LINES);

    if (lines.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await evaluateCustomQueries(lines, {
      prisma: prisma as unknown as QueryablePrisma,
      orgId,
      defaultStart: parseDate(parsed.data.start),
      defaultEnd: parseDate(parsed.data.end),
    });

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ReportAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}
