import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { createMember } from '@/lib/members';
import { getActiveTemplate } from '@/lib/forms/form-template-service';
import { parseCsvObjects } from '@/lib/csv';
import type { FormField } from '@/lib/forms/form-templates';
import type { MemberStatus } from '@prisma/client';

const STATUS_VALUES: MemberStatus[] = ['ACTIVE', 'LAPSED', 'CANCELLED', 'DECEASED'];

function coerceStatus(raw: string): MemberStatus {
  const upper = raw.trim().toUpperCase();
  return (STATUS_VALUES as string[]).includes(upper) ? (upper as MemberStatus) : 'ACTIVE';
}

function coerceCustom(field: FormField, raw: string): unknown {
  const v = raw.trim();
  if (v === '') return undefined;
  switch (field.type) {
    case 'number':
    case 'integer':
    case 'count': {
      const n = Number(v);
      if (!Number.isFinite(n)) {
        throw new Error(`custom:${field.key} "${v}" is not a valid number`);
      }
      if ((field.type === 'integer' || field.type === 'count') && !Number.isInteger(n)) {
        throw new Error(`custom:${field.key} "${v}" must be an integer`);
      }
      return n;
    }
    case 'boolean': {
      if (/^(true|yes|1|y)$/i.test(v)) return true;
      if (/^(false|no|0|n)$/i.test(v)) return false;
      throw new Error(`custom:${field.key} "${v}" is not a valid boolean (use true/false/yes/no/1/0)`);
    }
    case 'multiselect': {
      const parts = v.split(/[;|]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0) {
        throw new Error(`custom:${field.key} "${v}" has no valid options (separate with ; or |)`);
      }
      return parts;
    }
    case 'date':
    case 'datetime':
      return v;
    default:
      return v;
  }
}

interface RowResult {
  row: number;
  email?: string;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'member:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let csvText: string;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No CSV file uploaded' }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    const body = await request.json().catch(() => ({}));
    csvText = typeof body.csv === 'string' ? body.csv : '';
  }
  if (!csvText.trim()) {
    return NextResponse.json({ error: 'Empty CSV' }, { status: 400 });
  }

  const { headers, rows } = parseCsvObjects(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
  }

  const template = await getActiveTemplate(orgId, 'MEMBER');
  const customFields = (template?.fields ?? []).filter((f) => !f.archived);
  const customByHeader: Record<string, FormField> = {};
  for (const h of headers) {
    if (!h.startsWith('custom:')) continue;
    const key = h.slice('custom:'.length);
    const field = customFields.find((f) => f.key === key);
    if (field) customByHeader[h] = field;
  }

  const results: RowResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const email = (row.email ?? '').trim().toLowerCase();
    if (!email) {
      failed++;
      results.push({ row: rowNum, status: 'failed', reason: 'email required' });
      continue;
    }

    const existing = await prisma.member.findFirst({
      where: {
        clerkOrganizationId: orgId,
        email: { equals: email, mode: 'insensitive' },
        archivedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      results.push({ row: rowNum, email, status: 'skipped', reason: 'email exists' });
      continue;
    }

    try {
      const customFieldsPayload: Record<string, unknown> = {};
      for (const [header, field] of Object.entries(customByHeader)) {
        const coerced = coerceCustom(field, row[header] ?? '');
        if (coerced !== undefined) customFieldsPayload[field.key] = coerced;
      }

      await createMember(
        orgId,
        {
          email,
          firstName: row.firstName ?? '',
          lastName: row.lastName ?? '',
          phone: row.phone || null,
          addressLine1: row.addressLine1 || null,
          addressLine2: row.addressLine2 || null,
          suburb: row.suburb || null,
          state: row.state || null,
          postcode: row.postcode || null,
          country: row.country || 'AU',
          memberNumber: row.memberNumber || null,
          status: row.status ? coerceStatus(row.status) : 'ACTIVE',
          joinedAt: row.joinedAt ? row.joinedAt : null,
          customFields: customFieldsPayload,
        },
        { cachedTemplate: template }
      );
      created++;
      results.push({ row: rowNum, email, status: 'created' });
    } catch (err) {
      failed++;
      const reason = err instanceof Error ? err.message : 'unknown error';
      results.push({ row: rowNum, email, status: 'failed', reason });
    }
  }

  logAudit({
    userId,
    orgId,
    action: 'CREATE',
    entity: 'Member',
    metadata: { import: true, created, skipped, failed, total: rows.length },
  });

  return NextResponse.json({ total: rows.length, created, skipped, failed, results });
}
