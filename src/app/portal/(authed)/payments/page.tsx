import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

const KIND_LABEL: Record<string, string> = {
  DONATION_ONE_OFF: 'Donation',
  DONATION_RECURRING: 'Recurring donation',
  MEMBERSHIP_ONE_OFF: 'Membership',
  MEMBERSHIP_RECURRING: 'Membership instalment',
};

export default async function PortalPaymentsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const payments = await prisma.payment.findMany({
    where: { memberId: session.member.id, status: 'SUCCEEDED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment history</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your donations and membership payments. Receipts download as printable PDFs.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Receipts</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.createdAt.toLocaleDateString('en-AU')}</TableCell>
                      <TableCell>{KIND_LABEL[p.kind] ?? p.kind}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(p.amountCents, p.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.receiptNumber ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/portal/payments/${p.id}/receipt`} target="_blank">
                          <Button variant="outline" size="sm">View receipt</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
