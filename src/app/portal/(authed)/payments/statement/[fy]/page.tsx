import { auth } from '@/lib/clerk-server';
import { redirect, notFound } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { loadEofyStatement } from '@/lib/eofy';
import { EofyStatementView } from '@/components/receipt/eofy-statement-view';
import { PrintBar } from '@/app/admin/payments/[id]/receipt/print-bar';

export default async function PortalStatementPage({
  params,
}: {
  params: Promise<{ fy: string }>;
}) {
  const { fy } = await params;
  const fyEndYear = Number.parseInt(fy, 10);
  if (!Number.isInteger(fyEndYear)) return notFound();

  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const data = await loadEofyStatement(
    session.member.clerkOrganizationId,
    fyEndYear,
    session.email
  );
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <PrintBar backHref="/portal/payments" />
      <EofyStatementView data={data} />
    </div>
  );
}
