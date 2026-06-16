// One-shot CLI run by Coolify's native Scheduled Tasks (cron `15 2 * * *`).
// Runs the membership lifecycle sweep directly instead of calling the internal
// HTTP route, then exits. Notification idempotency lives in the DB via
// MembershipNotification, so re-running is safe.
import { prisma } from '@/lib/prisma';
import { runMembershipLifecycle } from '@/lib/membership-lifecycle-worker';

function log(event: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...payload }));
}

async function main() {
  log('membership.lifecycle.started');
  const summary = await runMembershipLifecycle();
  log('membership.lifecycle.completed', summary as unknown as Record<string, unknown>);
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    log('membership.lifecycle.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
