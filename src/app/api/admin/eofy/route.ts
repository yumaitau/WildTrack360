import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-server';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { gateFeature } from '@/lib/features';
import { aggregateDonorsForFy } from '@/lib/eofy';
import { financialYearEndYear, parseFinancialYearEndYear } from '@/lib/financial-year';

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
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw error;
  }

  const fyParam = new URL(request.url).searchParams.get('fy');
  const fyEndYear = fyParam ? parseFinancialYearEndYear(fyParam) : financialYearEndYear(new Date());
  if (!fyEndYear) {
    return NextResponse.json({ error: 'Invalid financial year' }, { status: 400 });
  }

  const donors = await aggregateDonorsForFy(orgId, fyEndYear);
  return NextResponse.json({ fyEndYear, donors });
}
