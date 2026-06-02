import { NextResponse } from 'next/server';
import { guardQlRequest } from '@/lib/ql/guard';
import { prisma } from '@/lib/prisma';
import { runQuery, QueryError } from '@/lib/ql';

type Params = { params: Promise<{ id: string }> };

// GET /api/ql/saved/[id]/run — execute a saved query and return its result.
// Used by dashboard query widgets. Tenant-scoped; never calls AI generation.
export async function GET(_request: Request, { params }: Params) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const saved = await prisma.savedQuery.findFirst({
    where: { id, clerkOrganizationId: guard.ctx.orgId },
  });
  if (!saved) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const result = await runQuery(saved.queryText, guard.ctx.orgId);
    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      chartType: saved.chartType,
      result,
    });
  } catch (e) {
    if (e instanceof QueryError) {
      // A saved query may have been valid when stored but reference data that
      // changed; surface a structured error so the widget shows an error state.
      return NextResponse.json({ error: e.message, details: e.details }, { status: 400 });
    }
    console.error('Saved query run failed:', e);
    return NextResponse.json({ error: 'Failed to run query' }, { status: 500 });
  }
}
