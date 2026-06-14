import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { aggregateDonorsForFy } from '@/lib/eofy';
import { financialYearEndYear } from '@/lib/financial-year';

// GET /api/admin/eofy?fy=YYYY — per-donor donation totals for a financial year
// (end year), for the admin annual-statements view.
export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const gated = await gateFeature(orgId, 'MEMBERSHIP_PLATFORM');
  if (gated) return gated;
  try {
    await requirePermission(userId, orgId, 'donation:view');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fyParam = new URL(request.url).searchParams.get('fy');
  const fyEndYear = fyParam ? Number.parseInt(fyParam, 10) : financialYearEndYear(new Date());
  if (!Number.isInteger(fyEndYear)) {
    return NextResponse.json({ error: 'Invalid financial year' }, { status: 400 });
  }

  const donors = await aggregateDonorsForFy(orgId, fyEndYear);
  return NextResponse.json({ fyEndYear, donors });
}
