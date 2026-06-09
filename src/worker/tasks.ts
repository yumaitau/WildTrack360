import { findDueSubscriptions, chargeSubscriptionNow } from '@/lib/square/billing';
import { refreshExpiringConnections } from '@/lib/square/oauth';

function log(event: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...payload }));
}

// Charge every recurring subscription whose nextChargeAt has passed. One failed
// charge doesn't abort the sweep — chargeSubscriptionNow handles its own dunning.
export async function chargeDueSubscriptionsTask(): Promise<void> {
  const due = await findDueSubscriptions(new Date());
  log('billing.due.found', { count: due.length });
  let ok = 0;
  let failed = 0;
  for (const sub of due) {
    try {
      const res = await chargeSubscriptionNow(sub.id);
      ok += 1;
      log('billing.charged', { subscriptionId: sub.id, status: res.status, paymentId: res.paymentId });
    } catch (error) {
      failed += 1;
      log('billing.charge.failed', {
        subscriptionId: sub.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  log('billing.due.completed', { ok, failed });
}

// Charge a single subscription out of band (e.g. an admin-triggered retry).
export async function chargeSubscriptionTask(data: unknown): Promise<void> {
  const subscriptionId = (data as { subscriptionId?: string })?.subscriptionId;
  if (!subscriptionId) throw new Error('chargeSubscriptionTask requires a subscriptionId');
  await chargeSubscriptionNow(subscriptionId);
}

export async function refreshSquareTokensTask(): Promise<void> {
  const count = await refreshExpiringConnections();
  log('square.tokens.refreshed', { count });
}
