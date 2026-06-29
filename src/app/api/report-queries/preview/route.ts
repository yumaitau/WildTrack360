import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateReportUser, canPreviewReports, ReportAccessError } from '@/lib/custom-query/access';
import { evaluateCustomQueries, type QueryablePrisma } from '@/lib/custom-query/evaluator';
import { getReportCarerNamesById } from '@/lib/custom-query/carer-names';
import { route } from '@/lib/openapi/route';
import { previewReportContract } from '../openapi';

const MAX_LINES = 20;

const previewSchema = z.object({
  query: z.string().optional(),
  queries: z.array(z.string()).max(MAX_LINES).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function needsCarerNames(queries: string[]) {
  return queries.some((q) => /\b(?:carerName|animal_assignments)\b/i.test(q));
}

// POST /api/report-queries/preview
//
// Evaluates one or more QL lines against the caller's org and returns
// aggregate-only result DTOs. This route performs NO AI generation and creates
// NO report drafts - it is a pure, read-only preview.
export const POST = route(previewReportContract, async ({ body }) => {
  try {
    const { orgId, role } = await authenticateReportUser();
    if (!canPreviewReports(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const lines = (parsed.data.queries ?? (parsed.data.query ? [parsed.data.query] : []))
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, MAX_LINES);

    if (lines.length === 0) return { data: { results: [] } };

    const carerNamesById = needsCarerNames(lines) ? await getReportCarerNamesById(orgId) : undefined;
    const results = await evaluateCustomQueries(lines, {
      prisma: prisma as unknown as QueryablePrisma,
      orgId,
      defaultStart: parseDate(parsed.data.start),
      defaultEnd: parseDate(parsed.data.end),
      carerNamesById,
    });

    return { data: { results } };
  } catch (error) {
    if (error instanceof ReportAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Report preview error:', error);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
});
