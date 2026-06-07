'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StripeCheckout } from '@/components/portal/stripe-checkout';

interface Tier {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  billingInterval: 'ONE_OFF' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
}

const INTERVAL_LABEL: Record<Tier['billingInterval'], string> = {
  ONE_OFF: 'one-off',
  MONTHLY: 'per month',
  ANNUAL: 'per year',
  LIFETIME: 'lifetime',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

export function MembershipPicker() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/tiers');
      if (!res.ok) throw new Error(await res.text());
      setTiers((await res.json()) as Tier[]);
    } catch (err) {
      toast.error(`Failed to load tiers: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function pick(tier: Tier) {
    setSubmitting(tier.id);
    try {
      const res = await fetch('/api/portal/checkout/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: tier.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Checkout failed');
      }
      const { clientSecret: secret } = (await res.json()) as { clientSecret: string };
      setClientSecret(secret);
      setSelectedTier(tier);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  if (clientSecret && selectedTier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedTier.name} · {formatAmount(selectedTier.amountCents, selectedTier.currency)}{' '}
            {INTERVAL_LABEL[selectedTier.billingInterval]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StripeCheckout
            clientSecret={clientSecret}
            returnUrl={`${window.location.origin}/portal/membership/thank-you`}
            onCancel={() => { setClientSecret(null); setSelectedTier(null); }}
          />
        </CardContent>
      </Card>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading tiers…</p>;
  if (tiers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No membership tiers configured yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tiers.map((t) => (
        <Card key={t.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <Badge variant="outline">{INTERVAL_LABEL[t.billingInterval]}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2">{formatAmount(t.amountCents, t.currency)}</p>
            {t.description && (
              <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => pick(t)}
              disabled={submitting !== null}
            >
              {submitting === t.id ? 'Loading…' : 'Choose this tier'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
