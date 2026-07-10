'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { payments as loadPayments } from '@square/web-sdk';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';

type SquarePayments = NonNullable<Awaited<ReturnType<typeof loadPayments>>>;
type SquareCard = Awaited<ReturnType<SquarePayments['card']>>;

interface SquareCheckoutProps {
  applicationId: string;
  locationId: string;
  // API route the tokenized card is POSTed to.
  endpoint: string;
  // Extra body fields (amountCents, tierId, interval, …) merged with the token.
  payload: Record<string, unknown>;
  amountCents: number;
  currency?: string;
  // CHARGE for one-off, STORE when vaulting a card for recurring.
  intent?: 'CHARGE' | 'STORE';
  buyerEmail?: string;
  submitLabel?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

// Square Web Payments SDK card form. Tokenizes the card client-side, runs buyer
// verification (SCA) when available, then POSTs { sourceId, verificationToken,
// ...payload } to the caller's endpoint which charges on the org's behalf.
export function SquareCheckout({
  applicationId,
  locationId,
  endpoint,
  payload,
  amountCents,
  currency = 'AUD',
  intent = 'CHARGE',
  buyerEmail,
  submitLabel = 'Pay',
  onSuccess,
  onCancel,
}: SquareCheckoutProps) {
  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let card: SquareCard | null = null;
    (async () => {
      try {
        const pmts = await loadPayments(applicationId, locationId);
        if (!pmts) throw new Error('Square failed to load');
        if (cancelled) return;
        paymentsRef.current = pmts;
        card = await pmts.card();
        if (cancelled) {
          await card.destroy();
          return;
        }
        if (containerRef.current) await card.attach(containerRef.current);
        cardRef.current = card;
        setReady(true);
      } catch (err) {
        toast.error(`Card form failed to load: ${(err as Error).message}`);
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current?.destroy().catch(() => {});
      cardRef.current = null;
    };
  }, [applicationId, locationId]);

  const pay = useCallback(async () => {
    const card = cardRef.current;
    const pmts = paymentsRef.current;
    if (!card || !pmts) return;
    setSubmitting(true);
    try {
      const tokenResult = await card.tokenize();
      if (tokenResult.status !== 'OK') {
        const message = 'errors' in tokenResult ? tokenResult.errors?.[0]?.message : undefined;
        throw new Error(message ?? 'Card could not be read');
      }
      const sourceId = tokenResult.token;

      let verificationToken: string | undefined;
      try {
        const verification = await pmts.verifyBuyer(sourceId, {
          amount: (amountCents / 100).toFixed(2),
          currencyCode: currency,
          intent,
          billingContact: buyerEmail ? { email: buyerEmail } : {},
        });
        verificationToken = verification?.token;
      } catch {
        // Buyer verification (SCA) unavailable — proceed with the source id.
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sourceId, verificationToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Payment failed');
      }
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [endpoint, payload, amountCents, currency, intent, buyerEmail, onSuccess]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="min-h-[90px]" />
      <div className="flex justify-between">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button type="button" onClick={pay} disabled={!ready || submitting}>
          {submitting ? 'Processing…' : submitLabel}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-right">Secured by Square</p>
    </div>
  );
}
