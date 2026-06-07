'use client';

import { useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements, PaymentElement, useElements, useStripe,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return stripePromise;
}

// Generic Stripe Elements wrapper. Callers pass the clientSecret from any
// PaymentIntent (one-off) or Subscription (recurring, via latest_invoice).
// Behavior is identical from Elements' perspective.
export function StripeCheckout({
  clientSecret,
  returnUrl,
  onCancel,
}: {
  clientSecret: string;
  returnUrl: string;
  onCancel?: () => void;
}) {
  const options = useMemo(
    () => ({ clientSecret, appearance: { theme: 'stripe' as const } }),
    [clientSecret]
  );
  return (
    <Elements stripe={getStripe()} options={options}>
      <ConfirmForm returnUrl={returnUrl} onCancel={onCancel} />
    </Elements>
  );
}

function ConfirmForm({ returnUrl, onCancel }: { returnUrl: string; onCancel?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-between">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Back
          </Button>
        ) : <div />}
        <Button type="submit" disabled={submitting || !stripe || !elements}>
          {submitting ? 'Confirming…' : 'Confirm'}
        </Button>
      </div>
    </form>
  );
}
