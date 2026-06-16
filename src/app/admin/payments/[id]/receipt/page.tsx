import { auth } from '@/lib/clerk-server';
import { redirect, notFound } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { loadReceiptData } from '@/lib/receipts';
import { ReceiptView } from '@/components/receipt/receipt-view';
import { PrintBar } from './print-bar';

export default async function AdminReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  try {
    await requirePermission(userId, orgId, 'donation:view');
  } catch {
    redirect('/');
  }

  const data = await loadReceiptData(id, orgId);
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <PrintBar backHref="/admin/payments" />
      <ReceiptView data={data} />
    </div>
  );
}
