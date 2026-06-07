import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { loadReceiptData } from '@/lib/receipts';
import { ReceiptView } from '@/components/receipt/receipt-view';
import { PrintBar } from '@/app/admin/payments/[id]/receipt/print-bar';
import { prisma } from '@/lib/prisma';

export default async function PortalReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  // Members can only fetch their own receipts.
  const payment = await prisma.payment.findFirst({
    where: { id, memberId: session.member.id },
    select: { id: true, clerkOrganizationId: true },
  });
  if (!payment) return notFound();

  const data = await loadReceiptData(id, payment.clerkOrganizationId);
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <PrintBar backHref="/portal/payments" />
      <ReceiptView data={data} />
    </div>
  );
}
