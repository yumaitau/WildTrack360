import { Worker, type Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { getRedisConnection, bullConnection, getQueue, closeBullClients } from './bull';
import {
  QUEUE_NAMES,
  QUEUE_CONCURRENCY,
  RECURRING_SCHEDULES,
  DEFAULT_ATTEMPTS,
  DEFAULT_BACKOFF_MS,
  DEFAULT_REMOVE_ON_COMPLETE,
  DEFAULT_REMOVE_ON_FAIL,
  JOB_CHARGE_DUE,
  JOB_CHARGE_ONE,
  JOB_REFRESH_TOKENS,
} from './bull-config';
import {
  chargeDueSubscriptionsTask,
  chargeSubscriptionTask,
  refreshSquareTokensTask,
} from './tasks';

const JOB_HANDLERS: Record<string, (data: unknown) => Promise<void>> = {
  [JOB_CHARGE_DUE]: () => chargeDueSubscriptionsTask(),
  [JOB_CHARGE_ONE]: (data) => chargeSubscriptionTask(data),
  [JOB_REFRESH_TOKENS]: () => refreshSquareTokensTask(),
};

function log(event: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...payload }));
}

// Register the cron job schedulers (BullMQ repeatable jobs) and prune any that
// are no longer in RECURRING_SCHEDULES (handles renames between deploys).
async function reconcileSchedulers() {
  const desired = new Set(RECURRING_SCHEDULES.map((s) => s.schedulerId));
  for (const schedule of RECURRING_SCHEDULES) {
    await getQueue(schedule.queue).upsertJobScheduler(
      schedule.schedulerId,
      { pattern: schedule.pattern },
      {
        name: schedule.jobName,
        data: {},
        opts: {
          attempts: DEFAULT_ATTEMPTS,
          backoff: { type: 'exponential', delay: DEFAULT_BACKOFF_MS },
          removeOnComplete: DEFAULT_REMOVE_ON_COMPLETE,
          removeOnFail: DEFAULT_REMOVE_ON_FAIL,
        },
      }
    );
    log('worker.scheduler.upserted', { schedulerId: schedule.schedulerId, pattern: schedule.pattern });
  }
  for (const queueName of new Set(RECURRING_SCHEDULES.map((s) => s.queue))) {
    const queue = getQueue(queueName);
    for (const scheduler of await queue.getJobSchedulers()) {
      if (scheduler?.key && !desired.has(scheduler.key)) {
        await queue.removeJobScheduler(scheduler.key);
        log('worker.scheduler.removed', { schedulerId: scheduler.key });
      }
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to start the worker.');
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required to start the worker.');

  getRedisConnection();
  await reconcileSchedulers();

  const workers: Worker[] = [];
  for (const queueName of QUEUE_NAMES) {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const handler = JOB_HANDLERS[job.name];
        if (!handler) throw new Error(`No handler registered for job "${job.name}" on "${queueName}".`);
        await handler(job.data);
      },
      { connection: bullConnection(), concurrency: QUEUE_CONCURRENCY[queueName] }
    );
    worker.on('completed', (job) =>
      log('job.completed', { queue: queueName, jobId: job.id, name: job.name })
    );
    worker.on('failed', (job, error) =>
      log('job.failed', {
        queue: queueName,
        jobId: job?.id,
        name: job?.name,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    workers.push(worker);
  }
  log('worker.started', { queues: QUEUE_NAMES.length });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log('worker.stopping', { signal });
    await Promise.all(workers.map((w) => w.close())).catch(() => {});
    await closeBullClients().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    log('worker.stopped');
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

void main().catch((error) => {
  log('worker.fatal', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
