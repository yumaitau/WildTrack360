import { NextResponse } from 'next/server';
import { guardQlRequest } from '@/lib/ql/guard';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { parseQuery } from '@/lib/ql/parser';
import { validateQuery } from '@/lib/ql/validate';
import { isChartType, MAX_QUERY_LENGTH } from '@/lib/ql/sources';

// GET /api/ql/saved — list saved queries for the caller's org.
// Pass ?dashboard=1 to return only those flagged for the dashboard.
export async function GET(request: Request) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;

  const dashboardOnly = new URL(request.url).searchParams.get('dashboard') === '1';

  const queries = await prisma.savedQuery.findMany({
    where: {
      clerkOrganizationId: guard.ctx.orgId,
      ...(dashboardOnly ? { showOnDashboard: true } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(queries);
}

// POST /api/ql/saved — create a saved query (org-scoped, RBAC protected).
export async function POST(request: Request) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const queryText = typeof body?.queryText === 'string' ? body.queryText : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : null;
  const chartType = isChartType(body?.chartType) ? body.chartType : 'table';
  const showOnDashboard = body?.showOnDashboard === true;

  if (!name || name.length > 120) {
    return NextResponse.json({ error: 'A name (1–120 chars) is required' }, { status: 400 });
  }
  if (!queryText || queryText.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'A query is required' }, { status: 400 });
  }

  // Re-validate against the allowlist before persisting so we never store junk.
  const { ast, error } = parseQuery(queryText);
  if (!ast) return NextResponse.json({ error: error ?? 'Invalid query' }, { status: 400 });
  const validation = validateQuery(ast);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Query is not valid', details: validation.errors }, { status: 400 });
  }

  const created = await prisma.savedQuery.create({
    data: {
      name,
      description,
      queryText,
      chartType,
      showOnDashboard,
      clerkOrganizationId: guard.ctx.orgId,
      createdByUserId: guard.ctx.userId,
    },
  });

  logAudit({
    userId: guard.ctx.userId,
    orgId: guard.ctx.orgId,
    action: 'CREATE',
    entity: 'SavedQuery',
    entityId: created.id,
    metadata: { name, chartType, showOnDashboard },
  });

  return NextResponse.json(created, { status: 201 });
}
