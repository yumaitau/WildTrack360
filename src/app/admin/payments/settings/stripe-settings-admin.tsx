'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConnectStatus {
  connected: boolean;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export function StripeSettingsAdmin() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const searchParams = useSearchParams();

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/connect/status${refresh ? '?refresh=true' : ''}`);
      if (!res.ok) throw new Error(await res.text());
      setStatus((await res.json()) as ConnectStatus);
    } catch (err) {
      toast.error(`Failed to fetch status: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh from Stripe when returning from onboarding flow.
  useEffect(() => {
    if (searchParams?.get('ok') === '1') {
      toast.success('Onboarding complete — refreshing status from Stripe');
      load(true);
    } else if (searchParams?.get('refresh') === '1') {
      load(true);
    }
  }, [searchParams, load]);

  async function startOnboarding() {
    setStarting(true);
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to start onboarding');
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Stripe settings
          </h1>
          <Link href="/admin/payments">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payments
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connected account</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your organisation&apos;s Stripe account so donations and membership fees settle directly to you. WildTrack360 takes a 5% platform fee on each transaction.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !status ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : !status.connected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No Stripe account connected yet. Click below to start onboarding via Stripe.
                </p>
                <Button onClick={startOnboarding} disabled={starting}>
                  {starting ? 'Redirecting…' : 'Connect Stripe account'}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Stripe account:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{status.stripeAccountId}</code>
                </div>
                <StatusRow label="Details submitted" ok={status.detailsSubmitted} />
                <StatusRow label="Charges enabled" ok={status.chargesEnabled} />
                <StatusRow label="Payouts enabled" ok={status.payoutsEnabled} />
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => load(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh from Stripe
                  </Button>
                  {!status.detailsSubmitted && (
                    <Button size="sm" onClick={startOnboarding} disabled={starting}>
                      {starting ? 'Redirecting…' : 'Continue onboarding'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How the 5% fee works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              On every donation or membership payment, WildTrack360 applies a 5% <code>application_fee_amount</code> via Stripe Connect. The remaining 95% transfers to your connected account.
            </p>
            <p>
              Stripe also takes its standard processing fee from the payment. The platform fee is independent.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      {ok ? (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Yes
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">
          Not yet
        </Badge>
      )}
    </div>
  );
}
