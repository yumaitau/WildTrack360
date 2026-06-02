import { NextResponse } from 'next/server';
import { guardQlRequest } from '@/lib/ql/guard';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { parseQuery } from '@/lib/ql/parser';
import { validateQuery } from '@/lib/ql/validate';
import { isChartType, MAX_QUERY_LENGTH } from '@/lib/ql/sources';

type Params = { params: Promise<{ id: string }> };

// GET /api/ql/saved/[id] — fetch a single saved query (tenant-scoped).
export async function GET(_request: Request, { params }: Params) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const query = await prisma.savedQuery.findFirst({
    where: { id, clerkOrganizationId: guard.ctx.orgId },
  });
  if (!query) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(query);
}

// PATCH /api/ql/saved/[id] — update a saved query. Tenant ownership is verified
// first by matching { id, clerkOrganizationId }; only safe fields are updatable.
export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const existing = await prisma.savedQuery.findFirst({
    where: { id, clerkOrganizationId: guard.ctx.orgId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'A name (1–120 chars) is required' }, { status: 400 });
    }
    data.name = name;
  }
  if (body?.description !== undefined) {
    data.description = typeof body.description === 'string' ? body.description.trim() : null;
  }
  if (body?.chartType !== undefined) {
    if (!isChartType(body.chartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 });
    }
    data.chartType = body.chartType;
  }
  if (body?.showOnDashboard !== undefined) {
    data.showOnDashboard = body.showOnDashboard === true;
  }
  if (body?.queryText !== undefined) {
    const queryText = typeof body.queryText === 'string' ? body.queryText : '';
    if (!queryText || queryText.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ error: 'A query is required' }, { status: 400 });
    }
    const { ast, error } = parseQuery(queryText);
    if (!ast) return NextResponse.json({ error: error ?? 'Invalid query' }, { status: 400 });
    const validation = validateQuery(ast);
    if (!validation.ok) {
      return NextResponse.json({ error: 'Query is not valid', details: validation.errors }, { status: 400 });
    }
    data.queryText = queryText;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Scope the write by org as well — defence in depth.
  await prisma.savedQuery.updateMany({
    where: { id, clerkOrganizationId: guard.ctx.orgId },
    data,
  });
  const updated = await prisma.savedQuery.findFirst({
    where: { id, clerkOrganizationId: guard.ctx.orgId },
  });

  logAudit({
    userId: guard.ctx.userId,
    orgId: guard.ctx.orgId,
    action: 'UPDATE',
    entity: 'SavedQuery',
    entityId: id,
    metadata: { fields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}

// DELETE /api/ql/saved/[id] — delete a saved query (tenant-scoped).
export async function DELETE(_request: Request, { params }: Params) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const result = await prisma.savedQuery.deleteMany({
    where: { id, clerkOrganizationId: guard.ctx.orgId },
  });
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  logAudit({
    userId: guard.ctx.userId,
    orgId: guard.ctx.orgId,
    action: 'DELETE',
    entity: 'SavedQuery',
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
