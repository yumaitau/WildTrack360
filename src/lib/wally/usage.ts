import 'server-only';

import { prisma } from '@/lib/prisma';
import { WALLY_DAILY_ORG_MESSAGE_LIMIT, WALLY_USAGE_TIME_ZONE } from '@/lib/wally/constants';

type WallyUsageReservation =
  | {
      allowed: true;
      dateKey: string;
      limit: number;
      used: number;
      remaining: number;
    }
  | {
      allowed: false;
      dateKey: string;
      limit: number;
      used: number;
      remaining: 0;
    };

function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export async function reserveWallyOrgMessage(orgId: string): Promise<WallyUsageReservation> {
  const dateKey = getDateKeyInTimeZone(new Date(), WALLY_USAGE_TIME_ZONE);
  const limit = WALLY_DAILY_ORG_MESSAGE_LIMIT;

  return prisma.$transaction(async (tx) => {
    await tx.wallyUsageSummary.upsert({
      where: {
        orgId_dateKey: { orgId, dateKey },
      },
      create: {
        orgId,
        dateKey,
        messageCount: 0,
      },
      update: {},
    });

    const increment = await tx.wallyUsageSummary.updateMany({
      where: {
        orgId,
        dateKey,
        messageCount: { lt: limit },
      },
      data: {
        messageCount: { increment: 1 },
      },
    });

    const usage = await tx.wallyUsageSummary.findUniqueOrThrow({
      where: {
        orgId_dateKey: { orgId, dateKey },
      },
      select: {
        messageCount: true,
      },
    });

    if (increment.count === 0) {
      return {
        allowed: false,
        dateKey,
        limit,
        used: usage.messageCount,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      dateKey,
      limit,
      used: usage.messageCount,
      remaining: Math.max(0, limit - usage.messageCount),
    };
  });
}
