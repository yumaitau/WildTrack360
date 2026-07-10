'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SquareCheckout } from '@/components/portal/square-checkout';

interface Subscription {
  id: string;
  kind: 'DONATION' | 'MEMBERSHIP';
  label: string;
  amountCents: number;
  currency: string;
  interval: 'MONTHLY' | 'ANNUAL';
  status: 'ACTIVE' | 'PENDING' | 'PAST_DUE';
  nextChargeAt: string;
  startedAt: string;
}

interface SquareConfig {
  applicationId: string;
  locationId: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-500/10 text-amber-700 border-amber-200',
  PAST_DUE: 'bg-red-500/10 text-red-700 border-red-200',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

export function ManageSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [editingCardFor, setEditingCardFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/subscriptions');
      if (!res.ok) throw new Error(await res.text());
      setSubs((await res.json()) as Subscription[]);
    } catch (err) {
      toast.error(`Failed to load subscriptions: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(sub: Subscription) {
    if (!confirm(`Cancel your ${sub.interval.toLowerCase()} ${sub.label}? It won't renew again.`)) return;
    setBusy(sub.id);
    try {
      const res = await fetch(`/api/portal/subscriptions/${sub.id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Cancel failed');
      toast.success('Subscription cancelled');
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openCardForm(subId: string) {
    if (!config) {
      try {
        const res = await fetch('/api/portal/square-config');
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Unavailable');
        setConfig((await res.json()) as SquareConfig);
      } catch (err) {
        toast.error((err as Error).message);
        return;
      }
    }
    setEditingCardFor(subId);
  }

  if (loading) return null;
  if (subs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your recurring payments</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage the donations and memberships that renew automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {subs.map((sub) => (
          <div key={sub.id} className="rounded-md border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{sub.label}</div>
                <div className="text-sm text-muted-foreground">
                  {formatAmount(sub.amountCents, sub.currency)} ·{' '}
                  {sub.interval === 'MONTHLY' ? 'monthly' : 'annually'} · next charge{' '}
                  {new Date(sub.nextChargeAt).toLocaleDateString('en-AU')}
                </div>
              </div>
              <Badge variant="outline" className={STATUS_COLORS[sub.status]}>
                {sub.status}
              </Badge>
            </div>

            {editingCardFor === sub.id && config ? (
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-sm mb-2">Enter the new card to use for this subscription.</p>
                <SquareCheckout
                  applicationId={config.applicationId}
                  locationId={config.locationId}
                  endpoint={`/api/portal/subscriptions/${sub.id}/card`}
                  payload={{}}
                  amountCents={sub.amountCents}
                  currency={sub.currency}
                  intent="STORE"
                  submitLabel="Save card"
                  onSuccess={() => {
                    setEditingCardFor(null);
                    toast.success('Payment method updated');
                  }}
                  onCancel={() => setEditingCardFor(null)}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCardForm(sub.id)}
                  disabled={busy === sub.id}
                >
                  Update payment method
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => cancel(sub)}
                  disabled={busy === sub.id}
                >
                  {busy === sub.id ? 'Cancelling…' : 'Cancel'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
