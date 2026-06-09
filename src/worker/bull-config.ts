// BullMQ queues + job-scheduler config. Mirrors the alignr worker pattern,
// trimmed to WildTrack360's needs: a `billing` queue that runs the self-billed
// Square recurring charges, and a `maintenance` queue for token refresh.

export const QUEUE_NAMES = ['billing', 'maintenance'] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export const DEFAULT_ATTEMPTS = 3;
export const DEFAULT_BACKOFF_MS = 60_000;
export const DEFAULT_REMOVE_ON_COMPLETE = { age: 7 * 24 * 60 * 60, count: 200 } as const;
export const DEFAULT_REMOVE_ON_FAIL = { age: 30 * 24 * 60 * 60, count: 500 } as const;

export const QUEUE_CONCURRENCY: Record<QueueName, number> = {
  billing: 4,
  maintenance: 1,
};

// Job names — handlers are keyed by these in worker-main.ts.
export const JOB_CHARGE_DUE = 'charge_due_subscriptions';
export const JOB_CHARGE_ONE = 'charge_subscription';
export const JOB_REFRESH_TOKENS = 'refresh_square_tokens';

export interface RecurringSchedule {
  schedulerId: string;
  queue: QueueName;
  jobName: string;
  pattern: string;
}

export const RECURRING_SCHEDULES: RecurringSchedule[] = [
  // Sweep due subscriptions daily at 02:00. The task itself only charges subs
  // whose nextChargeAt has passed, so the cadence just bounds latency.
  { schedulerId: 'charge-due-subscriptions', queue: 'billing', jobName: JOB_CHARGE_DUE, pattern: '0 2 * * *' },
  // Refresh Square OAuth tokens nearing their 30-day expiry every 6 hours.
  { schedulerId: 'refresh-square-tokens', queue: 'maintenance', jobName: JOB_REFRESH_TOKENS, pattern: '0 */6 * * *' },
];
