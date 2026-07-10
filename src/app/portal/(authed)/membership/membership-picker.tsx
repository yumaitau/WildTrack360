'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SquareCheckout } from '@/components/portal/square-checkout';
import { coverFeesCents } from '@/lib/fees';

interface Tier {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  billingInterval: 'ONE_OFF' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  benefits: string[];
}

interface SquareConfig {
  applicationId: string;
  locationId: string;
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
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [coverFees, setCoverFees] = useState(true);
  const [preparing, setPreparing] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  async function pick(tier: Tier) {
    setPreparing(tier.id);
    try {
      const res = await fetch('/api/portal/square-config');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Payments are not available right now');
      }
      setConfig((await res.json()) as SquareConfig);
      setSelectedTier(tier);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPreparing(null);
    }
  }

  if (config && selectedTier) {
    const isRecurring =
      selectedTier.billingInterval === 'MONTHLY' || selectedTier.billingInterval === 'ANNUAL';
    const feeCents = coverFeesCents(selectedTier.amountCents);
    const totalCents = coverFees ? selectedTier.amountCents + feeCents : selectedTier.amountCents;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedTier.name} · {formatAmount(totalCents, selectedTier.currency)}{' '}
            {INTERVAL_LABEL[selectedTier.billingInterval]}
          </CardTitle>
          {coverFees && feeCents > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatAmount(selectedTier.amountCents, selectedTier.currency)} membership +{' '}
              {formatAmount(feeCents, selectedTier.currency)} to cover fees
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {feeCents > 0 && (
            <label className="flex items-start gap-2 text-sm rounded-md border p-3 cursor-pointer hover:bg-accent/50">
              <input
                type="checkbox"
                checked={coverFees}
                onChange={(e) => setCoverFees(e.target.checked)}
                className="h-4 w-4 mt-0.5"
              />
              <span>
                Add <strong>{formatAmount(feeCents, selectedTier.currency)}</strong> to help cover
                transaction fees so your full membership reaches the organisation
                {isRecurring ? ' each renewal' : ''}.
              </span>
            </label>
          )}
          <SquareCheckout
            applicationId={config.applicationId}
            locationId={config.locationId}
            endpoint="/api/portal/checkout/membership"
            payload={{ tierId: selectedTier.id, coverFees }}
            amountCents={totalCents}
            currency={selectedTier.currency}
            intent={isRecurring ? 'STORE' : 'CHARGE'}
            submitLabel="Join"
            onSuccess={() => router.push('/portal/membership/thank-you')}
            onCancel={() => {
              setConfig(null);
              setSelectedTier(null);
            }}
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
            {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            {t.benefits.length > 0 && (
              <ul className="space-y-1">
                {t.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button className="w-full" onClick={() => pick(t)} disabled={preparing !== null}>
              {preparing === t.id ? 'Loading…' : 'Choose this tier'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
