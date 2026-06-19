import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { getActiveTemplate } from '@/lib/forms/form-template-service';
import { toCsv } from '@/lib/csv';
import { route } from '@/lib/openapi/route';
import { sampleImportTemplateContract } from './openapi';

const STANDARD_HEADERS = [
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
];

const SAMPLE_ROW = [
  'jane@example.org',
  'Jane',
  'Doe',
  '0400000000',
  '12 Example St',
  '',
  'Sydney',
  'NSW',
  '2000',
  'AU',
  'M0001',
  'ACTIVE',
  '2024-03-15',
];

export const GET = route(sampleImportTemplateContract, async () => {
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

  const template = await getActiveTemplate(orgId, 'MEMBER');
  const customFields = (template?.fields ?? []).filter((f) => !f.archived);
  const customHeaders = customFields.map((f) => `custom:${f.key}`);
  const customSample = customFields.map((f) => {
    switch (f.type) {
      case 'boolean':
        return 'true';
      case 'number':
      case 'integer':
      case 'count':
        return '0';
      case 'date':
        return '2024-01-01';
      case 'datetime':
        return '2024-01-01T09:00:00Z';
      case 'select':
        return f.options[0] ?? '';
      case 'multiselect':
        return (f.options.slice(0, 2).join(';')) || '';
      default:
        return '';
    }
  });

  const headers = [...STANDARD_HEADERS, ...customHeaders];
  const sample = [...SAMPLE_ROW, ...customSample];
  const csv = toCsv([headers, sample]);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="members-sample.csv"`,
    },
  });
});
