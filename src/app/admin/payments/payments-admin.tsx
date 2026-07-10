'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Settings, RefreshCw, FileText } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface PaymentRow {
  id: string;
  kind: string;
  status: string;
  amountCents: number;
  applicationFeeCents: number;
  processingFeeCents: number | null;
  currency: string;
  receiptNumber: string | null;
  createdAt: string;
  member: { firstName: string; lastName: string; email: string } | null;
  donations: { donorEmail: string; donorName: string | null; isAnonymous: boolean }[];
}

const STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  REQUIRES_ACTION: 'bg-amber-500/10 text-amber-700 border-amber-200',
  FAILED: 'bg-red-500/10 text-red-700 border-red-200',
  REFUNDED: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
};

const KIND_LABEL: Record<string, string> = {
  DONATION_ONE_OFF: 'Donation',
  DONATION_RECURRING: 'Recurring donation',
  MEMBERSHIP_ONE_OFF: 'Membership',
  MEMBERSHIP_RECURRING: 'Recurring membership',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

export function PaymentsAdmin() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error(await res.text());
      setRows((await res.json()) as PaymentRow[]);
    } catch (err) {
      toast.error(`Failed to load payments: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Payments
          </h1>
          <div className="flex gap-2">
            <Link href="/admin/payments/statements">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" /> Tax statements
              </Button>
            </Link>
            <Link href="/admin/payments/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" /> Square settings
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payment ledger</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                One row per Square payment. The platform fee (5%) is collected via Square&apos;s app
                fee; the rest settles to your Square account, less Square&apos;s processing fee.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Donor / Member</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Platform fee</TableHead>
                    <TableHead className="text-right">Square fee</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No payments yet. Once Square is connected, donations and membership payments will appear here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const donor = r.donations[0];
                      const donorLabel = donor?.isAnonymous
                        ? 'Anonymous'
                        : donor?.donorName ?? donor?.donorEmail ?? null;
                      const memberLabel = r.member ? `${r.member.firstName} ${r.member.lastName}` : null;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{new Date(r.createdAt).toLocaleString('en-AU')}</TableCell>
                          <TableCell>{KIND_LABEL[r.kind] ?? r.kind}</TableCell>
                          <TableCell>{donorLabel ?? memberLabel ?? '—'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(r.amountCents, r.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatAmount(r.applicationFeeCents, r.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {r.processingFeeCents == null
                              ? '—'
                              : formatAmount(r.processingFeeCents, r.currency)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.receiptNumber ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.status === 'SUCCEEDED' && (
                              <Link href={`/admin/payments/${r.id}/receipt`} target="_blank">
                                <Button variant="ghost" size="sm">Receipt</Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
