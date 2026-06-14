'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { financialYearEndYear, financialYearLabel } from '@/lib/financial-year';

interface DonorAggregate {
  donorEmail: string;
  donorName: string | null;
  count: number;
  totalCents: number;
}

const money = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);

export function StatementsAdmin() {
  const currentFy = financialYearEndYear(new Date());
  const years = [currentFy, currentFy - 1, currentFy - 2, currentFy - 3];

  const [fy, setFy] = useState(currentFy);
  const [donors, setDonors] = useState<DonorAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/eofy?fy=${fy}`, { signal });
        if (!res.ok)
          throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load');
        const data = await res.json();
        if (!signal?.aborted) setDonors(data.donors as DonorAggregate[]);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        toast.error((err as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [fy]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const grandTotal = donors.reduce((s, d) => s + d.totalCents, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <FileText className="h-6 w-6" /> Annual donation statements
          </h1>
          <Link href="/admin/payments">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payments
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Donors by financial year</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Consolidated tax statements for each donor. Open one to print or save it as a PDF to
                send to donors who don&apos;t use the member portal.
              </p>
            </div>
            <Select value={String(fy)} onValueChange={(v) => setFy(Number(v))}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {financialYearLabel(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading…</p>
            ) : donors.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No donations recorded for this financial year.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Gifts</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Statement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donors.map((d) => (
                      <TableRow key={d.donorEmail}>
                        <TableCell className="font-medium">{d.donorName ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {d.donorEmail}
                        </TableCell>
                        <TableCell className="text-right">{d.count}</TableCell>
                        <TableCell className="text-right font-mono">
                          {money(d.totalCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/payments/statements/view?fy=${fy}&email=${encodeURIComponent(d.donorEmail)}`}
                            target="_blank"
                          >
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-mono font-semibold">
                        {money(grandTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
