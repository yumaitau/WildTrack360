'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SquareCheckout } from '@/components/portal/square-checkout';
import { coverFeesCents } from '@/lib/fees';

const QUICK_AMOUNTS = [25, 50, 100, 250];
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface SquareConfig {
  applicationId: string;
  locationId: string;
}

export function DonateForm() {
  const router = useRouter();
  const [amountStr, setAmountStr] = useState('50');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(true);
  const [recurring, setRecurring] = useState<'NONE' | 'MONTHLY' | 'ANNUAL'>('NONE');
  const [config, setConfig] = useState<SquareConfig | null>(null);
  const [preparing, setPreparing] = useState(false);

  const amountCents = useMemo(() => {
    const n = Number.parseFloat(amountStr);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }, [amountStr]);

  const feeCents = useMemo(() => coverFeesCents(amountCents), [amountCents]);
  const totalCents = coverFees ? amountCents + feeCents : amountCents;

  async function startCheckout() {
    if (amountCents < 200) {
      toast.error('Minimum donation is $2');
      return;
    }
    setPreparing(true);
    try {
      const res = await fetch('/api/portal/square-config');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Payments are not available right now');
      }
      setConfig((await res.json()) as SquareConfig);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  if (config) {
    const endpoint =
      recurring === 'NONE'
        ? '/api/portal/checkout/donation'
        : '/api/portal/checkout/recurring-donation';
    const payload =
      recurring === 'NONE'
        ? { amountCents: totalCents, message: message || null, isAnonymous }
        : { amountCents: totalCents, interval: recurring, isAnonymous };
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {recurring === 'NONE'
              ? `Donating ${money(totalCents)} AUD`
              : `${recurring === 'MONTHLY' ? 'Monthly' : 'Annual'} donation of ${money(totalCents)} AUD`}
          </CardTitle>
          {coverFees && feeCents > 0 && (
            <p className="text-xs text-muted-foreground">
              {money(amountCents)} gift + {money(feeCents)} to cover fees
            </p>
          )}
        </CardHeader>
        <CardContent>
          <SquareCheckout
            applicationId={config.applicationId}
            locationId={config.locationId}
            endpoint={endpoint}
            payload={payload}
            amountCents={totalCents}
            intent={recurring === 'NONE' ? 'CHARGE' : 'STORE'}
            submitLabel={recurring === 'NONE' ? 'Donate' : 'Start donation'}
            onSuccess={() => router.push('/portal/donate/thank-you')}
            onCancel={() => setConfig(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donation amount</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <Button
              key={a}
              type="button"
              variant={amountStr === String(a) ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAmountStr(String(a))}
            >
              ${a}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">Custom amount (AUD)</Label>
          <Input
            id="amount"
            type="number"
            min="2"
            step="1"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <div className="flex gap-2">
            {(['NONE', 'MONTHLY', 'ANNUAL'] as const).map((r) => (
              <Button
                key={r}
                type="button"
                variant={recurring === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRecurring(r)}
              >
                {r === 'NONE' ? 'One-off' : r === 'MONTHLY' ? 'Monthly' : 'Annual'}
              </Button>
            ))}
          </div>
        </div>

        {recurring === 'NONE' && (
          <div className="space-y-1.5">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you'd like the organisation to know"
            />
          </div>
        )}

        {amountCents >= 200 && feeCents > 0 && (
          <label className="flex items-start gap-2 text-sm rounded-md border p-3 cursor-pointer hover:bg-accent/50">
            <input
              type="checkbox"
              checked={coverFees}
              onChange={(e) => setCoverFees(e.target.checked)}
              className="h-4 w-4 mt-0.5"
            />
            <span>
              Add <strong>{money(feeCents)}</strong> to help cover transaction fees so more of your{' '}
              {money(amountCents)} reaches the organisation
              {recurring !== 'NONE' ? ' each time' : ''}.
            </span>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4"
          />
          Show as anonymous in the donor list
        </label>

        <div className="flex justify-end">
          <Button onClick={startCheckout} disabled={preparing || amountCents < 200}>
            {preparing
              ? 'Preparing checkout…'
              : `Continue to payment · ${money(totalCents)}${
                  recurring !== 'NONE' ? ` / ${recurring === 'MONTHLY' ? 'mo' : 'yr'}` : ''
                }`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
