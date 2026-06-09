'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SquareCheckout } from '@/components/portal/square-checkout';

const QUICK_AMOUNTS = [25, 50, 100, 250];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [showCard, setShowCard] = useState(false);

  const amountCents = useMemo(() => {
    const n = Number.parseFloat(amountStr);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }, [amountStr]);

  function toCard() {
    if (amountCents < 200) return toast.error('Minimum donation is $2');
    if (!EMAIL.test(email)) return toast.error('Please enter a valid email for your receipt');
    setShowCard(true);
  }

  if (showCard) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Donating <strong>${(amountCents / 100).toFixed(2)} AUD</strong> to {orgName}
        </p>
        <SquareCheckout
          applicationId={applicationId}
          locationId={locationId}
          endpoint="/api/public/checkout/donation"
          payload={{
            handle,
            amountCents,
            donorName: name || null,
            donorEmail: email,
            message: message || null,
            isAnonymous,
          }}
          amountCents={amountCents}
          intent="CHARGE"
          buyerEmail={email}
          submitLabel={`Donate $${(amountCents / 100).toFixed(2)}`}
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
        Continue to payment · ${(amountCents / 100).toFixed(2)}
      </Button>
    </div>
  );
}
