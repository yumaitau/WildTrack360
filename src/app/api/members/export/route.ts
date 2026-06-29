import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { listMembers } from '@/lib/members';
import { getActiveTemplate } from '@/lib/forms/form-template-service';
import { toCsv } from '@/lib/csv';
import { route } from '@/lib/openapi/route';
import { exportMembersContract } from './openapi';

const STANDARD_COLUMNS = [
  'email',
  'firstName',
  'lastName',
  'phone',
  'addressLine1',
  'addressLine2',
  'suburb',
  'state',
  'postcode',
  'country',
  'memberNumber',
  'status',
  'joinedAt',
] as const;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export const GET = route(exportMembersContract, async ({ query }) => {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:view_all');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const includeArchived = query.includeArchived === 'true';

  const [members, template] = await Promise.all([
    listMembers(orgId, { includeArchived, limit: 5000 }),
    getActiveTemplate(orgId, 'MEMBER'),
  ]);

  const customFields = (template?.fields ?? []).filter((f) => !f.archived);
  const headers = [
    ...STANDARD_COLUMNS,
    ...customFields.map((f) => `custom:${f.key}`),
  ];

  const rows: (string | number | null)[][] = [headers as unknown as string[]];
  for (const m of members) {
    const custom = (m.customFieldsJson as Record<string, unknown> | null) ?? {};
    const stdValues: string[] = STANDARD_COLUMNS.map((col) => {
      const v = (m as unknown as Record<string, unknown>)[col];
      if (col === 'joinedAt' && v) return new Date(v as string).toISOString().slice(0, 10);
      return formatCell(v);
    });
    const customValues = customFields.map((f) => formatCell(custom[f.key]));
    rows.push([...stdValues, ...customValues]);
  }

  const csv = toCsv(rows);
  const filename = `members-${new Date().toISOString().slice(0, 10)}.csv`;

  logAudit({
    userId,
    orgId,
    action: 'EXPORT',
    entity: 'Member',
    metadata: { count: members.length, includeArchived },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
