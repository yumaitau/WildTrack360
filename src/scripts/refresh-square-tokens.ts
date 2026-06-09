// One-shot CLI run by Coolify's native Scheduled Tasks (cron `0 */6 * * *`).
// Refreshes Square OAuth access tokens nearing their 30-day expiry so long-idle
// orgs don't lapse before their next charge.
import { prisma } from '@/lib/prisma';
import { refreshExpiringConnections } from '@/lib/square/oauth';

async function main() {
  const count = await refreshExpiringConnections();
  console.log(JSON.stringify({ event: 'square.tokens.refreshed', count }));
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(
      JSON.stringify({
        event: 'square.tokens.refresh_failed',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
