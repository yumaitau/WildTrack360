import 'server-only';

import { prisma } from '@/lib/prisma';

const LIMITS = {
  post: { limit: 5, windowMs: 60 * 60_000 },
  comment: { limit: 30, windowMs: 60 * 60_000 },
  chat: { limit: 60, windowMs: 60 * 60_000 },
  reaction: { limit: 120, windowMs: 60 * 60_000 },
  report: { limit: 10, windowMs: 24 * 60 * 60_000 },
  edit: { limit: 10, windowMs: 60 * 60_000 },
  feedback: { limit: 10, windowMs: 24 * 60 * 60_000 },
  block: { limit: 60, windowMs: 60 * 60_000 },
} as const;

export type CommunityRateLimitAction = keyof typeof LIMITS;

export async function takeCommunityRateLimit(
  profileId: string,
  action: CommunityRateLimitAction,
  now = new Date()
) {
  const config = LIMITS[action];
  const windowStart = new Date(Math.floor(now.getTime() / config.windowMs) * config.windowMs);
  const bucket = await prisma.communityRateLimitBucket.upsert({
    where: { profileId_action_windowStart: { profileId, action, windowStart } },
    create: { profileId, action, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return {
    allowed: bucket.count <= config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowStart.getTime() + config.windowMs - now.getTime()) / 1000)
    ),
  };
}
