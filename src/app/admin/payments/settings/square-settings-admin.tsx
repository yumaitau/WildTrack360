'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmbedButtonsCard } from './embed-buttons-card';

interface ConnectionStatus {
  connected: boolean;
  revoked: boolean;
  merchantId: string | null;
  locationId: string | null;
  connectedAt: string | null;
}

export function SquareSettingsAdmin() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/square/connection/status');
      if (!res.ok) throw new Error(await res.text());
      setStatus((await res.json()) as ConnectionStatus);
    } catch (err) {
      toast.error(`Failed to fetch status: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Surface the result of the OAuth round-trip.
  useEffect(() => {
    if (searchParams?.get('ok') === '1') {
      toast.success('Square connected');
    } else if (searchParams?.get('error')) {
      toast.error(`Square connection failed: ${searchParams.get('error')}`);
    }
  }, [searchParams]);

  async function disconnect() {
    if (!confirm('Disconnect Square? Recurring charges will stop until you reconnect.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/square/connection/disconnect', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to disconnect');
      }
      toast.success('Square disconnected');
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Square settings
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
              Connect your organisation&apos;s Square account so donations and membership fees settle
              directly to you. WildTrack360 collects a 5% application fee on each transaction via
              Square; the remaining 95% (less Square&apos;s processing fee) stays in your account.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !status ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : !status.connected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No Square account connected yet. Click below to authorise WildTrack360 on your
                  Square account.
                </p>
                <a href="/api/square/oauth/authorize">
                  <Button>
                    Connect Square account
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 border-emerald-200"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Merchant:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{status.merchantId}</code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{status.locationId}</code>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={disconnect} disabled={disconnecting}>
                    <Unlink className="h-4 w-4 mr-2" />
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </Button>
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
              On every donation or membership payment, WildTrack360 takes a 5%{' '}
              <code>app_fee_money</code> via Square. Funds settle into your Square account and the fee
              is deposited to the platform automatically — no manual payouts.
            </p>
            <p>
              Square also takes its standard processing fee from the payment. The platform fee is
              independent and shown per transaction in the payments ledger.
            </p>
          </CardContent>
        </Card>

        {status?.connected && <EmbedButtonsCard />}
      </main>
    </div>
  );
}
