'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StripeCheckout } from '@/components/portal/stripe-checkout';

const QUICK_AMOUNTS = [25, 50, 100, 250];

export function DonateForm() {
  const [amountStr, setAmountStr] = useState('50');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [recurring, setRecurring] = useState<'NONE' | 'MONTHLY' | 'ANNUAL'>('NONE');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const amountCents = useMemo(() => {
    const n = Number.parseFloat(amountStr);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }, [amountStr]);

  async function startCheckout() {
    if (amountCents < 200) {
      toast.error('Minimum donation is $2');
      return;
    }
    setCreating(true);
    try {
      let endpoint = '/api/portal/checkout/donation';
      let body: Record<string, unknown> = {
        amountCents,
        message: message || null,
        isAnonymous,
      };
      if (recurring !== 'NONE') {
        endpoint = '/api/portal/checkout/recurring-donation';
        body = { amountCents, interval: recurring };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to start checkout');
      }
      const { clientSecret: secret } = (await res.json()) as { clientSecret: string };
      setClientSecret(secret);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {recurring === 'NONE'
              ? `Donating $${(amountCents / 100).toFixed(2)} AUD`
              : `${recurring === 'MONTHLY' ? 'Monthly' : 'Annual'} donation of $${(amountCents / 100).toFixed(2)} AUD`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StripeCheckout
            clientSecret={clientSecret}
            returnUrl={`${window.location.origin}/portal/donate/thank-you`}
            onCancel={() => setClientSecret(null)}
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
          <>
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

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4"
              />
              Show as anonymous in the donor list
            </label>
          </>
        )}

        <div className="flex justify-end">
          <Button onClick={startCheckout} disabled={creating || amountCents < 200}>
            {creating
              ? 'Preparing checkout…'
              : `Continue to payment · $${(amountCents / 100).toFixed(2)}${
                  recurring !== 'NONE' ? ` / ${recurring === 'MONTHLY' ? 'mo' : 'yr'}` : ''
                }`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
