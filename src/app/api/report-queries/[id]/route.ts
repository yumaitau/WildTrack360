import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  authenticateReportUser,
  canManageReport,
  ReportAccessError,
} from '@/lib/custom-query/access';
import { parseCustomQuery } from '@/lib/custom-query/parser';
import {
  CUSTOM_QUERY_VISUALIZATIONS,
  CustomQueryError,
} from '@/lib/custom-query/types';

const NAME_MAX = 120;
const QUERY_MAX = 500;

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX).optional(),
    query: z.string().trim().min(1).max(QUERY_MAX).optional(),
    visualization: z.enum(CUSTOM_QUERY_VISUALIZATIONS).optional(),
    showOnDashboard: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields to update',
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

// PATCH /api/report-queries/:id — update name/query/visual/dashboard visibility.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authCtx = await authenticateReportUser();

    // Always scope the lookup by { id, orgId } to enforce tenant isolation.
    const existing = await prisma.savedReportQuery.findFirst({
      where: { id, orgId: authCtx.orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!canManageReport(authCtx, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.query !== undefined) {
      // Re-validate the QL text on update.
      const ast = parseCustomQuery(parsed.data.query);
      data.query = ast.raw;
    }
    if (parsed.data.visualization !== undefined) {
      data.visualization = parsed.data.visualization;
    }
    if (parsed.data.showOnDashboard !== undefined) {
      data.showOnDashboard = parsed.data.showOnDashboard;
    }

    // updateMany scoped by { id, orgId } — never a bare { id }.
    await prisma.savedReportQuery.updateMany({
      where: { id, orgId: authCtx.orgId },
      data,
    });

    logAudit({
      userId: authCtx.userId,
      orgId: authCtx.orgId,
      action: 'UPDATE',
      entity: 'SavedReportQuery',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    const updated = await prisma.savedReportQuery.findFirst({
      where: { id, orgId: authCtx.orgId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/report-queries/:id — remove a saved query.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authCtx = await authenticateReportUser();

    const existing = await prisma.savedReportQuery.findFirst({
      where: { id, orgId: authCtx.orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!canManageReport(authCtx, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.savedReportQuery.deleteMany({
      where: { id, orgId: authCtx.orgId },
    });

    logAudit({
      userId: authCtx.userId,
      orgId: authCtx.orgId,
      action: 'DELETE',
      entity: 'SavedReportQuery',
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
