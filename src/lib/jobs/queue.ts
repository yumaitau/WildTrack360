import { getQueue } from '@/worker/bull';
import {
  JOB_CHARGE_ONE,
  DEFAULT_ATTEMPTS,
  DEFAULT_BACKOFF_MS,
  DEFAULT_REMOVE_ON_COMPLETE,
  DEFAULT_REMOVE_ON_FAIL,
} from '@/worker/bull-config';

// Producer API for enqueuing an out-of-band charge for a single subscription
// (e.g. a manual retry from the admin UI). Normal renewals are driven by the
// scheduled `charge_due_subscriptions` sweep, not this.
export async function enqueueSubscriptionCharge(subscriptionId: string, runAt?: Date) {
  const delay = runAt ? Math.max(0, runAt.getTime() - Date.now()) : 0;
  return getQueue('billing').add(
    JOB_CHARGE_ONE,
    { subscriptionId },
    {
      jobId: `charge:${subscriptionId}:${runAt ? runAt.getTime() : 'now'}`,
      delay,
      attempts: DEFAULT_ATTEMPTS,
      backoff: { type: 'exponential', delay: DEFAULT_BACKOFF_MS },
      removeOnComplete: DEFAULT_REMOVE_ON_COMPLETE,
      removeOnFail: DEFAULT_REMOVE_ON_FAIL,
    }
  );
}
