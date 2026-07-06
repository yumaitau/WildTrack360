import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import type { AuditAction, Prisma } from '@prisma/client';
import { route } from '@/lib/openapi/route';
import { listAuditLogsContract } from './openapi';
import { resolveClerkUserEmailMap } from '@/lib/clerk-user-display';

const VALID_ACTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'ROLE_CHANGE',
  'ASSIGN',
  'UNASSIGN',
  'SUBMIT',
  'APPROVE',
  'REJECT',
  'EXPORT',
];

const VALID_ENTITIES = new Set([
  'Animal',
  'Record',
  'Species',
  'ReleaseChecklist',
  'HygieneLog',
  'IncidentReport',
  'Asset',
  'CarerTraining',
  'CarerProfile',
  'OrgMember',
  'SpeciesGroup',
  'CoordinatorSpeciesAssignment',
  'AIAssistantDiscussion',
]);

const USER_SEARCH_PATTERN = /^[a-zA-Z0-9_@.\-\s+]{1,160}$/;

const VALID_SORT_FIELDS = ['createdAt', 'action', 'entity', 'userId', 'userEmail'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

export const GET = route(listAuditLogsContract, async ({ query }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(userId, orgId, 'user:manage');

    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25', 10) || 25));
    const skip = (page - 1) * pageSize;

    const actionFilter = query.action;
    const entityFilter = query.entity;
    const userFilter = query.user ?? query.userId;

    const where: Prisma.AuditLogWhereInput = { orgId };
    if (actionFilter && VALID_ACTIONS.includes(actionFilter as AuditAction))
      where.action = actionFilter as AuditAction;
    if (entityFilter && VALID_ENTITIES.has(entityFilter)) where.entity = entityFilter;
    if (userFilter && USER_SEARCH_PATTERN.test(userFilter)) {
      where.OR = [
        { userId: { contains: userFilter, mode: 'insensitive' } },
        { userName: { contains: userFilter, mode: 'insensitive' } },
        { userEmail: { contains: userFilter, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy as SortField | null;
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      sortBy && VALID_SORT_FIELDS.includes(sortBy) ? { [sortBy]: sortDir } : { createdAt: 'desc' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    const userIdsToResolve = new Set(logs.map((log) => log.userId));
    const emailByUserId = await resolveClerkUserEmailMap(userIdsToResolve);
    const displayLogs = logs.map((log) => ({
      ...log,
      userEmail: log.userEmail || emailByUserId.get(log.userId) || null,
    }));

    return {
      data: {
        data: displayLogs,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
});
