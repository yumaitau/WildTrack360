import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import type { AuditAction, Prisma } from '@prisma/client';

const VALID_ACTIONS: AuditAction[] = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ROLE_CHANGE', 'ASSIGN', 'UNASSIGN',
];

const VALID_ENTITIES = new Set([
  'Animal', 'Record', 'Species', 'ReleaseChecklist',
  'HygieneLog', 'IncidentReport', 'Asset', 'CarerTraining',
  'CarerProfile', 'OrgMember', 'SpeciesGroup', 'CoordinatorSpeciesAssignment',
]);

// Clerk user IDs are alphanumeric with underscores, max ~50 chars
const USER_ID_PATTERN = /^[a-zA-Z0-9_]{1,128}$/;

const VALID_SORT_FIELDS = ['createdAt', 'action', 'entity', 'userId'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Admin-only endpoint
    await requirePermission(userId, orgId, 'user:manage');

    const { searchParams } = new URL(request.url);

    // Pagination (guard against NaN from non-numeric input)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10) || 25));
    const skip = (page - 1) * pageSize;

    // Filters
    const actionFilter = searchParams.get('action');
    const entityFilter = searchParams.get('entity');
    const userIdFilter = searchParams.get('userId');

    const where: Prisma.AuditLogWhereInput = { orgId };

    if (actionFilter && VALID_ACTIONS.includes(actionFilter as AuditAction)) {
      where.action = actionFilter as AuditAction;
    }
    if (entityFilter && VALID_ENTITIES.has(entityFilter)) {
      where.entity = entityFilter;
    }
    if (userIdFilter && USER_ID_PATTERN.test(userIdFilter)) {
      where.userId = userIdFilter;
    }

    // Sorting
    const sortBy = searchParams.get('sortBy') as SortField | null;
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      sortBy && VALID_SORT_FIELDS.includes(sortBy)
        ? { [sortBy]: sortDir }
        : { createdAt: 'desc' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
