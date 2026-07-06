import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@/lib/clerk-server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import type { AuditAction, Prisma } from '@prisma/client';
import { route } from '@/lib/openapi/route';
import { listAuditLogsContract } from './openapi';

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

type AuditUserLookup = Map<string, { email: string; searchable: string }>;

type OrgMembership = {
  publicUserData?: {
    userId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    identifier?: string | null;
  } | null;
};

async function getAuditUserLookup(orgId: string): Promise<AuditUserLookup> {
  const client = await clerkClient();
  const users: AuditUserLookup = new Map();
  const limit = 100;
  let offset = 0;

  while (true) {
    const batch = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit,
      offset,
    });
    for (const membership of batch.data as OrgMembership[]) {
      const publicUserData = membership.publicUserData;
      const userId = publicUserData?.userId;
      if (!userId) continue;
      const email = publicUserData?.identifier || '';
      const searchable = [
        userId,
        publicUserData?.firstName,
        publicUserData?.lastName,
        [publicUserData?.firstName, publicUserData?.lastName].filter(Boolean).join(' '),
        email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      users.set(userId, { email, searchable });
    }
    if (batch.data.length < limit) break;
    offset += limit;
  }

  return users;
}

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
      let matchingUserIds: string[] = [];
      try {
        const userLookup = await getAuditUserLookup(orgId);
        const normalizedFilter = userFilter.trim().toLowerCase();
        matchingUserIds = [...userLookup.entries()]
          .filter(([, user]) => user.searchable.includes(normalizedFilter))
          .map(([id]) => id);
      } catch {
        matchingUserIds = [];
      }
      where.OR = [
        { userId: { contains: userFilter, mode: 'insensitive' } },
        ...(matchingUserIds.length > 0 ? [{ userId: { in: matchingUserIds } }] : []),
      ];
    }

    const sortBy = query.sortBy as SortField | null;
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
    const sortByUserEmail = sortBy === 'userEmail';
    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      sortBy && VALID_SORT_FIELDS.includes(sortBy) && !sortByUserEmail
        ? { [sortBy]: sortDir }
        : { createdAt: 'desc' };

    const [logs, total] = sortByUserEmail
      ? await (async () => {
          const allLogs = await prisma.auditLog.findMany({ where, orderBy });
          let userLookup: AuditUserLookup = new Map();
          try {
            userLookup = await getAuditUserLookup(orgId);
          } catch {
            userLookup = new Map();
          }
          allLogs.sort((a, b) => {
            const aEmail = userLookup.get(a.userId)?.email || '';
            const bEmail = userLookup.get(b.userId)?.email || '';
            const emailOrder = aEmail.localeCompare(bEmail);
            if (emailOrder !== 0) return sortDir === 'asc' ? emailOrder : -emailOrder;
            return b.createdAt.getTime() - a.createdAt.getTime();
          });
          return [allLogs.slice(skip, skip + pageSize), allLogs.length] as const;
        })()
      : await Promise.all([
          prisma.auditLog.findMany({ where, orderBy, skip, take: pageSize }),
          prisma.auditLog.count({ where }),
        ]);

    return {
      data: {
        data: logs,
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
