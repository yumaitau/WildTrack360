// One-shot CLI run by Coolify's native Scheduled Tasks (cron `0 2 * * *`).
// Charges every recurring subscription whose nextChargeAt has passed, then
// exits. Billing state (nextChargeAt, failedAttempts/dunning) lives in the DB,
// so no queue/worker is needed — each run simply processes what's due. Safe to
// re-run: a charge advances its own sub's nextChargeAt, so an interrupted run's
// unprocessed subs are picked up next time without double-charging.
import { prisma } from '@/lib/prisma';
import { findDueSubscriptions, chargeSubscriptionNow } from '@/lib/square/billing';

function log(event: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...payload }));
}

async function main() {
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

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    log('billing.fatal', { error: error instanceof Error ? error.message : String(error) });
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
