import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  authenticateReportUser,
  canSaveReports,
  ReportAccessError,
} from '@/lib/custom-query/access';
import { parseCustomQuery } from '@/lib/custom-query/parser';
import {
  CUSTOM_QUERY_VISUALIZATIONS,
  CustomQueryError,
} from '@/lib/custom-query/types';

const NAME_MAX = 120;
const QUERY_MAX = 500;

const createSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  query: z.string().trim().min(1).max(QUERY_MAX),
  visualization: z.enum(CUSTOM_QUERY_VISUALIZATIONS).optional(),
  showOnDashboard: z.boolean().optional(),
});

function handleError(error: unknown) {
  if (error instanceof ReportAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof CustomQueryError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error('Saved report query route error:', error);
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}

// GET /api/report-queries — list saved queries for the current org.
export async function GET() {
  try {
    const { orgId } = await authenticateReportUser();
    const queries = await prisma.savedReportQuery.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(queries);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/report-queries — create a saved query (validates QL text).
export async function POST(request: Request) {
  try {
    const { userId, orgId, role } = await authenticateReportUser();
    if (!canSaveReports(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { name, query, visualization, showOnDashboard } = parsed.data;

    // Validate the query through the parser — never persist unparseable text.
    const ast = parseCustomQuery(query);

    const created = await prisma.savedReportQuery.create({
      data: {
        orgId,
        createdByUserId: userId,
        name,
        query: ast.raw,
        visualization: visualization ?? ast.visualization,
        showOnDashboard: showOnDashboard ?? false,
      },
    });

    logAudit({
      userId,
      orgId,
      action: 'CREATE',
      entity: 'SavedReportQuery',
      entityId: created.id,
      metadata: { name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
