import IORedis, { type RedisOptions } from 'ioredis';
import { Queue, type ConnectionOptions } from 'bullmq';
import type { QueueName } from './bull-config';

let connection: IORedis | null = null;
const queues = new Map<QueueName, Queue>();

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is required for BullMQ.');
  return url;
}

export function getRedisConnection(): IORedis {
  if (!connection) {
    // BullMQ requires maxRetriesPerRequest: null on the shared connection.
    const opts: RedisOptions = { maxRetriesPerRequest: null, enableReadyCheck: false };
    connection = new IORedis(getRedisUrl(), opts);
  }
  return connection;
}

// BullMQ accepts a shared IORedis instance at runtime, but its ConnectionOptions
// union doesn't include the IORedis type across minor version skews — cast it.
export function bullConnection(): ConnectionOptions {
  return getRedisConnection() as unknown as ConnectionOptions;
}

export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: bullConnection() });
    queues.set(name, queue);
  }
  return queue;
}

export async function closeBullClients(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
