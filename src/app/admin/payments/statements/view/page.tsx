import { auth } from '@/lib/clerk-server';
import { redirect, notFound } from 'next/navigation';
import { isForbiddenError, requirePermission } from '@/lib/rbac';
import { isFeatureEnabled } from '@/lib/features';
import { loadEofyStatement } from '@/lib/eofy';
import { parseFinancialYearEndYear } from '@/lib/financial-year';
import { EofyStatementView } from '@/components/receipt/eofy-statement-view';
import { PrintBar } from '@/app/admin/payments/[id]/receipt/print-bar';

export default async function AdminStatementView({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; email?: string }>;
}) {
  const { fy, email } = await searchParams;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  if (!(await isFeatureEnabled(orgId, 'MEMBERSHIP_PLATFORM'))) redirect('/admin');
  try {
    await requirePermission(userId, orgId, 'donation:view');
  } catch (error) {
    if (isForbiddenError(error)) redirect('/');
    throw error;
  }

  const fyEndYear = parseFinancialYearEndYear(fy);
  if (!fyEndYear || !email) return notFound();

  const data = await loadEofyStatement(orgId, fyEndYear, email);
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <PrintBar backHref="/admin/payments/statements" />
      <EofyStatementView data={data} />
    </div>
  );
}
