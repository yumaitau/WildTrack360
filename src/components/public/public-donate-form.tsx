'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SquareCheckout } from '@/components/portal/square-checkout';
import { coverFeesCents } from '@/lib/fees';

const QUICK_AMOUNTS = [25, 50, 100, 250];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface Props {
  handle: string;
  applicationId: string;
  locationId: string;
  orgName: string;
}

export function PublicDonateForm({ handle, applicationId, locationId, orgName }: Props) {
  const router = useRouter();
  const [amountStr, setAmountStr] = useState('50');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(true);
  const [showCard, setShowCard] = useState(false);

  const amountCents = useMemo(() => {
    const n = Number.parseFloat(amountStr);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }, [amountStr]);

  const feeCents = useMemo(() => coverFeesCents(amountCents), [amountCents]);
  const totalCents = coverFees ? amountCents + feeCents : amountCents;

  function toCard() {
    if (amountCents < 200) return toast.error('Minimum donation is $2');
    if (!EMAIL.test(email)) return toast.error('Please enter a valid email for your receipt');
    setShowCard(true);
  }

  if (showCard) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Donating <strong>{money(totalCents)} AUD</strong> to {orgName}
          {coverFees && feeCents > 0 && (
            <> ({money(amountCents)} gift + {money(feeCents)} to cover fees)</>
          )}
        </p>
        <SquareCheckout
          applicationId={applicationId}
          locationId={locationId}
          endpoint="/api/public/checkout/donation"
          payload={{
            handle,
            amountCents: totalCents,
            donorName: name || null,
            donorEmail: email,
            message: message || null,
            isAnonymous,
          }}
          amountCents={totalCents}
          intent="CHARGE"
          buyerEmail={email}
          submitLabel={`Donate ${money(totalCents)}`}
          onSuccess={() => router.push('/donate/thank-you')}
          onCancel={() => setShowCard(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <Label htmlFor="amount">Amount (AUD)</Label>
        <Input
          id="amount"
          type="number"
          min="2"
          step="1"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email (for your receipt)</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea
          id="message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Anything you'd like ${orgName} to know`}
        />
      </div>

      {amountCents >= 200 && feeCents > 0 && (
        <label className="flex items-start gap-2 text-sm rounded-md border p-3 cursor-pointer hover:bg-accent/50">
          <input
            type="checkbox"
            checked={coverFees}
            onChange={(e) => setCoverFees(e.target.checked)}
            className="h-4 w-4 mt-0.5"
          />
          <span>
            Add <strong>{money(feeCents)}</strong> to cover transaction fees so{' '}
            <strong>100%</strong> of your {money(amountCents)} reaches {orgName}.
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
        Make this donation anonymous
      </label>

      <Button className="w-full" onClick={toCard} disabled={amountCents < 200}>
        Continue to payment · {money(totalCents)}
      </Button>
    </div>
  );
}
