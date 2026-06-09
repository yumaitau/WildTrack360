'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TierDialog, type TierFormValue } from './tier-dialog';

type BillingInterval = 'ONE_OFF' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
type GstHandling = 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE';

interface Tier {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  billingInterval: BillingInterval;
  gstHandling: GstHandling;
  active: boolean;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const body = await res.json(); msg = body.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  ONE_OFF: 'One-off',
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
  LIFETIME: 'Lifetime',
};

export function TiersAdmin() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<Tier[]>('/api/membership-tiers');
      setTiers(data);
    } catch (err) {
      toast.error(`Failed to load tiers: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(values: TierFormValue) {
    try {
      if (editing) {
        await apiJson(`/api/membership-tiers/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        toast.success('Tier updated');
      } else {
        await apiJson('/api/membership-tiers', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        toast.success('Tier created');
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleArchive(tier: Tier) {
    if (!confirm(`Archive tier "${tier.name}"?`)) return;
    try {
      await apiJson(`/api/membership-tiers/${tier.id}`, { method: 'DELETE' });
      toast.success('Tier archived');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Membership tiers</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pricing tiers used for membership checkout. Recurring tiers are billed automatically each cycle.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New tier
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : tiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No tiers yet. Add one to enable membership checkout.
                  </TableCell>
                </TableRow>
              ) : (
                tiers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.name}
                      {t.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatAmount(t.amountCents, t.currency)}</TableCell>
                    <TableCell>{INTERVAL_LABEL[t.billingInterval]}</TableCell>
                    <TableCell>{t.gstHandling}</TableCell>
                    <TableCell>
                      <Badge variant={t.active ? 'default' : 'secondary'}>
                        {t.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(t)}>
                        Archive
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <TierDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
